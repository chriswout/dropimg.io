import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME } from "../../marketing/content";
import { LOCALES, LOCALE_CONFIG } from "../../marketing/locales";
import {
  PAGE_IDS,
  allMarketingUrls,
  alternateLinks,
  pageDir,
  pagePath,
  pageUrl,
} from "../../marketing/pages";
import { renderPage } from "../../marketing/render";

describe("marketing locales & paths", () => {
  it("exposes four locales without /en/", () => {
    expect(LOCALES).toEqual(["en", "es", "pt-BR", "de"]);
    expect(pagePath("home", "en")).toBe("/");
    expect(pagePath("home", "es")).toBe("/es");
    expect(pagePath("home", "pt-BR")).toBe("/pt-br");
    expect(pagePath("home", "de")).toBe("/de");
  });

  it("keeps temporary share routes out of marketing paths", () => {
    const paths = allMarketingUrls().join(" ");
    expect(paths).not.toMatch(/\/api\//);
    expect(paths).not.toMatch(/\/i\//);
    expect(paths).not.toMatch(/\/d\//);
  });

  it("has reciprocal hreflang sets per page", () => {
    for (const pageId of PAGE_IDS) {
      const links = alternateLinks(pageId);
      expect(links.map((l) => l.hreflang).sort()).toEqual(
        ["de", "en", "es", "pt-BR", "x-default"].sort(),
      );
      expect(links.find((l) => l.hreflang === "x-default")?.href).toBe(
        pageUrl(pageId, "en"),
      );
    }
  });
});

describe("renderPage metadata", () => {
  for (const pageId of PAGE_IDS) {
    for (const locale of LOCALES) {
      it(`${pageId}/${locale} has lang, canonical, hreflang`, () => {
        const html = renderPage(pageId, locale);
        const cfg = LOCALE_CONFIG[locale];
        const canonical = pageUrl(pageId, locale);
        expect(html).toContain(`lang="${cfg.htmlLang}"`);
        expect(html).toContain(`data-locale="${locale}"`);
        expect(html).toContain(`rel="canonical" href="${canonical}"`);
        for (const alt of alternateLinks(pageId)) {
          expect(html).toContain(
            `hreflang="${alt.hreflang}" href="${alt.href}"`,
          );
        }
        expect(html).not.toMatch(/name="robots" content="[^"]*noindex/);
        expect(html).toContain("<title>");
        expect(html).toContain('name="description"');
      });
    }
  }

  it("homepage header has a Sign in control", () => {
    expect(renderPage("home", "en")).toContain('id="account-signin"');
    expect(renderPage("home", "en")).toContain("Sign in");
    expect(renderPage("home", "es")).toContain("Entrar");
    expect(renderPage("home", "en")).toContain('id="account-plan"');
    expect(renderPage("home", "en")).toContain('class="account-menu"');
    expect(renderPage("home", "en")).toContain("Upgrade to Pro");
    expect(renderPage("home", "en")).toContain("Edit account");
    expect(renderPage("home", "en")).toContain('id="theme-toggle"');
    expect(renderPage("home", "en")).toContain("dropimg:theme");
    expect(renderPage("home", "en")).not.toMatch(
      /header-actions[\s\S]*?<a class="account-link" href="\/pro">Pro<\/a>/,
    );
  });

  it("English homepage H1 matches product copy", () => {
    const html = renderPage("home", "en");
    expect(html).toContain(HOME.en.h1);
    expect(html).toContain("Drop an image. Get a link.");
  });

  it("Spanish homepage H1 is localized", () => {
    const html = renderPage("home", "es");
    expect(html).toContain("Suelta una imagen. Llévate el enlace.");
  });

  it("Portuguese and German homepage H1s sound native", () => {
    expect(renderPage("home", "pt-BR")).toContain("Solte a imagem. Pegue o link.");
    expect(renderPage("home", "de")).toContain("Bild rein. Link raus.");
  });

  it("homepage JSON-LD matches visible FAQ/HowTo counts", () => {
    for (const locale of LOCALES) {
      const html = renderPage("home", locale);
      const m = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      );
      expect(m).toBeTruthy();
      const data = JSON.parse(m![1]!);
      const faq = data["@graph"].find(
        (n: { "@type": string }) => n["@type"] === "FAQPage",
      );
      const howto = data["@graph"].find(
        (n: { "@type": string }) => n["@type"] === "HowTo",
      );
      expect(faq.mainEntity).toHaveLength(3);
      expect(howto.step).toHaveLength(3);
      expect(faq.mainEntity[0].name).toBe(HOME[locale].faqs[0].q);
      expect(howto.step[0].name).toBe(HOME[locale].howto[0].name);
    }
  });
});

describe("generated files (after generate:pages)", () => {
  it("writes all expected HTML paths when present", () => {
    for (const pageId of PAGE_IDS) {
      for (const locale of LOCALES) {
        const dir = pageDir(pageId, locale);
        const path =
          dir === "."
            ? join(process.cwd(), "index.html")
            : join(process.cwd(), dir, "index.html");
        // Generator runs in prebuild; allow skip if not generated in isolation
        if (!existsSync(path)) continue;
        const html = readFileSync(path, "utf8");
        expect(html).toContain("rel=\"canonical\"");
        expect(html).toContain("/client/main.ts");
      }
    }
  });
});
