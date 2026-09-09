/**
 * Builds a local, gitignored eval set for Phase 1.5a.
 * Sources: Wikimedia Commons (CC), Openverse (CC), generated UI screenshots.
 * No CSAM. Adult slice is public erotic/nude photography used only for local
 * classifier evaluation.
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

type Expect = "allow" | "block";

type Case = {
  id: string;
  path: string;
  expect: Expect;
  category: string;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "eval/moderation");
const UA =
  "DropIMG-moderation-eval/1.0 (https://dropimg.io; trust-and-safety classifier eval)";

const TARGETS: Array<{
  dir: string;
  expect: Expect;
  category: string;
  queries: string[];
  n: number;
}> = [
  {
    dir: "safe/beach",
    expect: "allow",
    category: "beach",
    queries: ["beach landscape", "people swimming ocean", "bikini beach"],
    n: 90,
  },
  {
    dir: "safe/medical",
    expect: "allow",
    category: "medical",
    queries: ["medical X-ray", "MRI scan image", "anatomy illustration"],
    n: 80,
  },
  {
    dir: "safe/cartoon",
    expect: "allow",
    category: "cartoon",
    queries: ["cartoon character drawing", "comic strip", "animated film still"],
    n: 80,
  },
  {
    dir: "safe/false-positive",
    expect: "allow",
    category: "false-positive",
    queries: [
      "nude marble statue",
      "renaissance nude painting",
      "man wearing shorts",
    ],
    n: 60,
  },
  {
    dir: "block/adult",
    expect: "block",
    category: "adult",
    queries: ["nude photograph", "erotic photography"],
    n: 90,
  },
  {
    dir: "block/violence",
    expect: "block",
    category: "violence",
    queries: ["war photograph combat", "bloody injury", "explosion attack"],
    n: 80,
  },
  {
    dir: "block/weapons",
    expect: "block",
    category: "weapons",
    queries: ["handgun pistol", "assault rifle", "soldier with firearm"],
    n: 80,
  },
  {
    dir: "block/drugs",
    expect: "block",
    category: "drugs",
    queries: ["cannabis marijuana plant", "drug paraphernalia", "heroin syringe"],
    n: 70,
  },
];

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function fetchJson(url: string): Promise<unknown> {
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error("fetchJson failed");
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return false;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type && !ALLOWED_MIME.has(type) && !type.startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 2_000 || buf.byteLength > 4_000_000) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function extFromUrl(url: string, mime?: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  const m = /\.(jpe?g|png|webp|gif)/i.exec(url);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function wikiUrls(query: string, want: number): Promise<Array<{ url: string; mime?: string }>> {
  const found: Array<{ url: string; mime?: string }> = [];
  let offset = 0;
  while (found.length < want && offset < want * 3) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "50",
      gsroffset: String(offset),
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "1024",
    });
    const data = (await fetchJson(
      `https://commons.wikimedia.org/w/api.php?${params}`,
    )) as {
      query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string; size?: number }> }> };
    };
    const pages = Object.values(data.query?.pages ?? {});
    if (!pages.length) break;
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const mime = info.mime;
      if (mime && !ALLOWED_MIME.has(mime)) continue;
      const url = info.thumburl || info.url;
      if (!url) continue;
      found.push({ url, mime });
    }
    offset += 50;
  }
  return found;
}

async function openverseUrls(query: string, want: number): Promise<Array<{ url: string; mime?: string }>> {
  const found: Array<{ url: string; mime?: string }> = [];
  let page = 1;
  while (found.length < want && page <= 6) {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      page_size: "40",
      license_type: "commercial,modification",
    });
    try {
      const data = (await fetchJson(`https://api.openverse.org/v1/images/?${params}`)) as {
        results?: Array<{ url?: string; thumbnail?: string }>;
      };
      for (const row of data.results ?? []) {
        const url = row.thumbnail || row.url;
        if (url) found.push({ url });
      }
    } catch {
      break;
    }
    page += 1;
  }
  return found;
}

function existingFiles(dir: string): string[] {
  const abs = join(outDir, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter((name) => /\.(jpe?g|png|webp|gif)$/i.test(name));
}

function addExisting(target: { dir: string; expect: Expect; category: string }, cases: Case[]) {
  for (const name of existingFiles(target.dir)) {
    const n = cases.filter((c) => c.category === target.category).length + 1;
    cases.push({
      id: `${target.category}-${n}`,
      path: `${target.dir}/${name}`,
      expect: target.expect,
      category: target.category,
    });
  }
}

async function fillCategory(target: (typeof TARGETS)[number], cases: Case[]) {
  mkdirSync(join(outDir, target.dir), { recursive: true });
  addExisting(target, cases);
  const seen = new Set<string>();
  let saved = existingFiles(target.dir).length;
  if (saved >= target.n) {
    console.log(`  ${target.dir} already has ${saved}, skipping`);
    return;
  }
  const sources = [];
  for (const q of target.queries) {
    try {
      sources.push(...(await wikiUrls(q, target.n)));
    } catch (err) {
      console.warn(`\n  wiki failed for ${q}:`, err instanceof Error ? err.message : err);
    }
    if (sources.length < target.n) {
      try {
        sources.push(...(await openverseUrls(q, target.n)));
      } catch (err) {
        console.warn(`\n  openverse failed for ${q}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  for (const item of sources) {
    if (saved >= target.n) break;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    const ext = extFromUrl(item.url, item.mime);
    const name = `${target.category}-${String(saved + 1).padStart(3, "0")}.${ext}`;
    const rel = `${target.dir}/${name}`;
    const ok = await downloadFile(item.url, join(outDir, rel));
    if (!ok) continue;
    saved += 1;
    cases.push({
      id: `${target.category}-${saved}`,
      path: rel,
      expect: target.expect,
      category: target.category,
    });
    process.stdout.write(`\r  ${target.dir} ${saved}/${target.n}   `);
  }
  process.stdout.write("\n");
}

function uiHtml(i: number): string {
  const titles = [
    "Dashboard",
    "Build failed",
    "Pull request #1842",
    "Settings",
    "API reference",
    "Inbox",
    "Stack trace",
    "Invoice",
  ];
  const title = titles[i % titles.length];
  const code = `function upload(file) {\n  if (file.size > 10_000_000) throw new Error("too large");\n  return fetch("/api/v1/images", { method: "POST", body: file });\n}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font:14px/1.45 ui-sans-serif,system-ui;margin:0;background:${i % 2 ? "#0b0e17" : "#f7f7fb"};color:${i % 2 ? "#e8eaf2" : "#111"};}
    header{padding:16px 24px;border-bottom:1px solid #8883;font-weight:700}
    main{padding:24px;max-width:860px}
    pre{background:${i % 2 ? "#15192a" : "#fff"};padding:16px;border-radius:8px;overflow:auto}
    table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #8884;padding:8px;text-align:left}
  </style></head><body>
  <header>DropIMG · ${title} · sample ${i + 1}</header>
  <main>
    <h1>${title}</h1>
    <p>Temporary image hosting UI screenshot ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Used only for classifier eval.</p>
    <pre><code>${code}\n// case ${i + 1}</code></pre>
    <table><tr><th>Slug</th><th>Expiry</th><th>Size</th></tr>
    <tr><td>abc${i}xy</td><td>7d</td><td>${120 + i} KB</td></tr>
    <tr><td>def${i}zz</td><td>24h</td><td>${80 + i} KB</td></tr></table>
  </main></body></html>`;
}

async function screenshots(cases: Case[]) {
  const dir = "safe/screenshot";
  mkdirSync(join(outDir, dir), { recursive: true });
  const already = existingFiles(dir);
  if (already.length >= 100) {
    for (const name of already) {
      cases.push({
        id: name.replace(/\.[^.]+$/, ""),
        path: `${dir}/${name}`,
        expect: "allow",
        category: "screenshot",
      });
    }
    console.log(`  ${dir} already has ${already.length}, skipping`);
    return;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  const n = 120;
  for (let i = 0; i < n; i++) {
    await page.setContent(uiHtml(i), { waitUntil: "domcontentloaded" });
    const rel = `${dir}/ui-${String(i + 1).padStart(3, "0")}.png`;
    await page.screenshot({ path: join(outDir, rel), type: "png" });
    cases.push({
      id: `screenshot-${i + 1}`,
      path: rel,
      expect: "allow",
      category: "screenshot",
    });
  }
  const publicPages = [
    "https://example.com/",
    "https://en.wikipedia.org/wiki/Screenshot",
    "https://en.wikipedia.org/wiki/Image_hosting_service",
    "https://developer.mozilla.org/en-US/docs/Web/HTML",
  ];
  for (const [idx, url] of publicPages.entries()) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const rel = `${dir}/web-${String(idx + 1).padStart(2, "0")}.png`;
      await page.screenshot({ path: join(outDir, rel), type: "png" });
      cases.push({
        id: `screenshot-web-${idx + 1}`,
        path: rel,
        expect: "allow",
        category: "screenshot",
      });
    } catch {
      // public page optional
    }
  }
  await browser.close();
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const cases: Case[] = [];
  console.log("Generating UI screenshots…");
  await screenshots(cases);
  for (const target of TARGETS) {
    console.log(`Downloading ${target.dir}…`);
    await fillCategory(target, cases);
  }
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(cases, null, 2)}\n`);
  const counts = new Map<string, number>();
  for (const row of cases) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  console.log("Wrote", cases.length, "images");
  console.log(Object.fromEntries(counts));
  if (cases.length < 400) {
    console.warn("Fewer than 400 images. Re-run or add more queries.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
