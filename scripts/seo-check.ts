/**
 * Lightweight SEO QA for generated marketing HTML + sitemap.
 * Run after: npm run generate:pages
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES, LOCALE_CONFIG } from "../marketing/locales";
import {
  INTENT_PAGE_IDS,
  allIntentUrls,
  intentAlternateLinks,
  intentLocales,
  intentPageCopy,
  intentPagePath,
  intentPageUrl,
} from "../marketing/intent-pages";
import {
  PAGE_IDS,
  allMarketingUrls,
  alternateLinks,
  pageDir,
  pageUrl,
  type PageId,
} from "../marketing/pages";
import { allProUrls } from "../marketing/pro";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

function fail(msg: string) {
  console.error(`FAIL: ${msg}`);
  failures++;
}

function ok(msg: string) {
  console.log(`OK: ${msg}`);
}

function htmlPath(pageId: PageId, locale: (typeof LOCALES)[number]): string {
  const dir = pageDir(pageId, locale);
  return dir === "." ? join(root, "index.html") : join(root, dir, "index.html");
}

function extractAll(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(html))) out.push(m[1]!);
  return out;
}

for (const pageId of PAGE_IDS) {
  for (const locale of LOCALES) {
    const path = htmlPath(pageId, locale);
    if (!existsSync(path)) {
      fail(`missing page ${path}`);
      continue;
    }
    const html = readFileSync(path, "utf8");
    const cfg = LOCALE_CONFIG[locale];
    const canonical = pageUrl(pageId, locale);

    if (!html.includes(`lang="${cfg.htmlLang}"`)) {
      fail(`${path}: missing lang=${cfg.htmlLang}`);
    }
    if (!html.includes(`data-locale="${locale}"`)) {
      fail(`${path}: missing data-locale`);
    }

    const titles = extractAll(html, /<title>([^<]*)<\/title>/i);
    if (titles.length !== 1 || !titles[0]!.trim()) fail(`${path}: bad title`);

    const descs = extractAll(
      html,
      /<meta\s+name="description"\s+content="([^"]*)"/i,
    );
    if (descs.length !== 1 || !descs[0]!.trim()) fail(`${path}: bad description`);

    const cans = extractAll(
      html,
      /<link\s+rel="canonical"\s+href="([^"]*)"/i,
    );
    if (cans.length !== 1) fail(`${path}: expected 1 canonical, got ${cans.length}`);
    else if (cans[0] !== canonical) fail(`${path}: canonical ${cans[0]} ≠ ${canonical}`);

    if (/noindex/i.test(html) && /name="robots"/i.test(html)) {
      const robots = extractAll(html, /<meta\s+name="robots"\s+content="([^"]*)"/i);
      if (robots.some((r) => /noindex/i.test(r))) {
        fail(`${path}: marketing page has noindex`);
      }
    }

    const alts: { hreflang: string; href: string }[] = [];
    const altRe =
      /<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = altRe.exec(html))) {
      alts.push({ hreflang: m[1]!, href: m[2]! });
    }

    const expected = alternateLinks(pageId);
    for (const exp of expected) {
      const found = alts.find((a) => a.hreflang === exp.hreflang);
      if (!found) fail(`${path}: missing hreflang ${exp.hreflang}`);
      else if (found.href !== exp.href) {
        fail(`${path}: hreflang ${exp.hreflang} → ${found.href} ≠ ${exp.href}`);
      }
    }
    if (!alts.some((a) => a.hreflang === "x-default")) {
      fail(`${path}: missing x-default`);
    }

    if (pageId === "home") {
      const ld = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      );
      if (!ld) fail(`${path}: missing JSON-LD`);
      else {
        try {
          const data = JSON.parse(ld[1]!);
          const app = data["@graph"]?.find(
            (n: { "@type"?: string }) => n["@type"] === "WebApplication",
          );
          if (!app) fail(`${path}: no WebApplication in JSON-LD`);
          else {
            if (app.url !== canonical) fail(`${path}: JSON-LD url mismatch`);
            if (app.inLanguage !== cfg.htmlLang) {
              fail(`${path}: JSON-LD inLanguage ${app.inLanguage}`);
            }
            if (app.name !== "dropimg.io") fail(`${path}: brand translated in schema`);
          }
          const faq = data["@graph"]?.find(
            (n: { "@type"?: string }) => n["@type"] === "FAQPage",
          );
          const howto = data["@graph"]?.find(
            (n: { "@type"?: string }) => n["@type"] === "HowTo",
          );
          if (!faq || faq.mainEntity?.length !== 3) {
            fail(`${path}: FAQ schema must have 3 items`);
          }
          if (!howto || howto.step?.length !== 3) {
            fail(`${path}: HowTo schema must have 3 steps`);
          }
        } catch (e) {
          fail(`${path}: invalid JSON-LD (${e})`);
        }
      }
    }
  }
}

// Reciprocity: every alternate must appear on the target page
for (const pageId of PAGE_IDS) {
  for (const locale of LOCALES) {
    const path = htmlPath(pageId, locale);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, "utf8");
    const alts: { hreflang: string; href: string }[] = [];
    const altRe =
      /<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = altRe.exec(html))) {
      alts.push({ hreflang: m[1]!, href: m[2]! });
    }
    for (const alt of alts) {
      if (alt.hreflang === "x-default") continue;
      // Find which locale file should contain reciprocal link back
      const targetLoc = LOCALES.find(
        (l) => pageUrl(pageId, l) === alt.href,
      );
      if (!targetLoc) {
        fail(`orphan hreflang ${alt.hreflang} → ${alt.href} on ${path}`);
        continue;
      }
      const targetHtml = readFileSync(htmlPath(pageId, targetLoc), "utf8");
      const back = pageUrl(pageId, locale);
      if (!targetHtml.includes(`href="${back}"`)) {
        fail(`missing reciprocal hreflang on ${alt.href} back to ${back}`);
      }
    }
  }
}

const sitemapPath = join(root, "public/sitemap.xml");
if (!existsSync(sitemapPath)) fail("missing public/sitemap.xml");
else {
  const sm = readFileSync(sitemapPath, "utf8");
  for (const url of allMarketingUrls()) {
    if (!sm.includes(`<loc>${url}</loc>`)) fail(`sitemap missing ${url}`);
  }
  if (sm.includes("/api/") || sm.includes("/i/") || sm.includes(":slug")) {
    fail("sitemap contains temporary/API patterns");
  }
  for (const privatePath of ["/login", "/app", "/account", "/admin"]) {
    if (sm.includes(`${privatePath}<`) || sm.includes(`${privatePath}/`)) {
      fail(`sitemap includes private route ${privatePath}`);
    }
  }
  for (const url of allProUrls()) {
    if (!sm.includes(`<loc>${url}</loc>`)) fail(`sitemap missing ${url}`);
  }
  if (!sm.includes(`<loc>https://dropimg.io/browser-extension</loc>`)) {
    fail("sitemap missing browser-extension");
  }
  for (const url of allIntentUrls()) {
    if (!sm.includes(`<loc>${url}</loc>`)) fail(`sitemap missing ${url}`);
  }
  const locs = extractAll(sm, /<loc>([^<]*)<\/loc>/g);
  const dup = locs.filter((u, i) => locs.indexOf(u) !== i);
  if (dup.length) fail(`sitemap duplicates: ${[...new Set(dup)].join(", ")}`);
  ok(`sitemap has ${locs.length} URLs`);
}

// English-only extension acquisition page
{
  const path = join(root, "browser-extension/index.html");
  if (!existsSync(path)) fail("missing browser-extension/index.html");
  else {
    const html = readFileSync(path, "utf8");
    if (!html.includes('rel="canonical" href="https://dropimg.io/browser-extension"')) {
      fail("browser-extension: bad canonical");
    }
    if (!html.includes("Screenshot to link")) fail("browser-extension: missing H1 copy");
    if (!html.includes('data-page-intent="browser-extension"')) {
      fail("browser-extension: missing data-page-intent");
    }
    ok("browser-extension page present");
  }
}

// Intent landings, including the localized ES / pt-BR clusters
let intentPageCount = 0;
for (const id of INTENT_PAGE_IDS) {
  const locales = intentLocales(id);
  const expectedAlts = intentAlternateLinks(id);

  for (const locale of locales) {
    intentPageCount++;
    const label = `${id} [${locale}]`;
    const dir = intentPagePath(id, locale).replace(/^\//, "");
    const path = join(root, dir, "index.html");
    if (!existsSync(path)) {
      fail(`missing intent page ${path}`);
      continue;
    }
    const html = readFileSync(path, "utf8");
    const copy = intentPageCopy(id, locale);
    const cfg = LOCALE_CONFIG[locale];

    if (!html.includes(`lang="${cfg.htmlLang}"`)) {
      fail(`${label}: missing lang=${cfg.htmlLang}`);
    }
    if (!html.includes(`rel="canonical" href="${intentPageUrl(id, locale)}"`)) {
      fail(`${label}: bad canonical`);
    }
    if (!html.includes(`data-page-intent="${id}"`)) {
      fail(`${label}: missing data-page-intent`);
    }
    if (!html.includes('id="dropzone"')) fail(`${label}: missing dropzone`);

    const h1s = extractAll(html, /<h1[^>]*>([^<]*)<\/h1>/i);
    if (h1s.length !== 1) fail(`${label}: expected 1 h1, got ${h1s.length}`);
    else if (h1s[0]!.trim() !== copy.h1) {
      fail(`${label}: h1 "${h1s[0]}" ≠ "${copy.h1}"`);
    }

    if (/noindex/i.test(html) && /name="robots"/i.test(html)) {
      const robots = extractAll(html, /<meta\s+name="robots"\s+content="([^"]*)"/i);
      if (robots.some((r) => /noindex/i.test(r))) fail(`${label}: has noindex`);
    }

    // Hreflang: exactly the cluster we authored, nothing invented.
    const alts: { hreflang: string; href: string }[] = [];
    const altRe =
      /<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = altRe.exec(html))) alts.push({ hreflang: m[1]!, href: m[2]! });
    if (alts.length !== expectedAlts.length) {
      fail(`${label}: ${alts.length} hreflang tags, expected ${expectedAlts.length}`);
    }
    for (const exp of expectedAlts) {
      const found = alts.find((a) => a.hreflang === exp.hreflang);
      if (!found) fail(`${label}: missing hreflang ${exp.hreflang}`);
      else if (found.href !== exp.href) {
        fail(`${label}: hreflang ${exp.hreflang} → ${found.href} ≠ ${exp.href}`);
      }
    }
    if (alts.some((a) => a.hreflang === "de")) {
      fail(`${label}: hreflang points at a German page that does not exist`);
    }

    const ld = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (!ld) fail(`${label}: missing JSON-LD`);
    else {
      try {
        const graph = JSON.parse(ld[1]!)["@graph"] as { "@type"?: string }[];
        const howto = graph?.find((n) => n["@type"] === "HowTo") as
          | { step?: unknown[] }
          | undefined;
        const faq = graph?.find((n) => n["@type"] === "FAQPage") as
          | { mainEntity?: unknown[] }
          | undefined;
        if (howto?.step?.length !== 3) fail(`${label}: HowTo needs 3 steps`);
        if (!faq?.mainEntity?.length) fail(`${label}: FAQPage has no questions`);
        else if (faq.mainEntity.length !== copy.faqs.length) {
          fail(`${label}: FAQ schema does not match visible FAQ`);
        }
      } catch (e) {
        fail(`${label}: invalid JSON-LD (${e})`);
      }
    }
  }

  // Reciprocity within the cluster.
  for (const locale of locales) {
    const path = join(root, intentPagePath(id, locale).replace(/^\//, ""), "index.html");
    if (!existsSync(path)) continue;
    const page = readFileSync(path, "utf8");
    for (const other of locales) {
      const href = intentPageUrl(id, other);
      if (!page.includes(`href="${href}"`)) {
        fail(`${id} [${locale}]: missing reciprocal hreflang to ${href}`);
      }
    }
  }
}
ok(`${intentPageCount} intent pages present`);

if (failures === 0) {
  ok(
    `all checks passed (${PAGE_IDS.length * LOCALES.length} pages + extension + ${intentPageCount} intents)`,
  );
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
