import { describe, expect, it } from "vitest";
import {
  INTENT_PAGE_IDS,
  allIntentUrls,
  intentAlternateLinks,
  intentLocales,
  intentPageCopy,
  intentPagePath,
  intentPageUrl,
  type IntentPageId,
} from "../../marketing/intent-pages";
import { renderIntentPage } from "../../marketing/render";
import { LOCALE_CONFIG } from "../../marketing/locales";

/** The two intents research picked as primary acquisition. */
const CLUSTERED: IntentPageId[] = ["image-to-url", "screenshot-to-link"];

describe("localized intent clusters", () => {
  it("ships the four new ES and pt-BR acquisition routes", () => {
    expect(intentPagePath("image-to-url", "es")).toBe("/es/imagen-a-url");
    expect(intentPagePath("image-to-url", "pt-BR")).toBe(
      "/pt-br/imagem-para-url",
    );
    expect(intentPagePath("screenshot-to-link", "es")).toBe(
      "/es/captura-de-pantalla-a-enlace",
    );
    expect(intentPagePath("screenshot-to-link", "pt-BR")).toBe(
      "/pt-br/colar-print-online",
    );
  });

  it("keeps the English acquisition URLs unchanged", () => {
    expect(intentPagePath("image-to-url", "en")).toBe("/image-to-url");
    expect(intentPagePath("screenshot-to-link", "en")).toBe(
      "/screenshot-to-link",
    );
  });

  it.each(CLUSTERED)("%s links en/es/pt-BR and x-default only", (id) => {
    expect(intentLocales(id)).toEqual(["en", "es", "pt-BR"]);
    expect(intentAlternateLinks(id)).toEqual([
      { hreflang: "en", href: intentPageUrl(id, "en") },
      { hreflang: "es", href: intentPageUrl(id, "es") },
      { hreflang: "pt-BR", href: intentPageUrl(id, "pt-BR") },
      { hreflang: "x-default", href: intentPageUrl(id, "en") },
    ]);
  });

  it("never advertises a German intent page that does not exist", () => {
    for (const id of INTENT_PAGE_IDS) {
      expect(intentAlternateLinks(id).map((a) => a.hreflang)).not.toContain(
        "de",
      );
      expect(intentLocales(id)).not.toContain("de");
    }
  });

  it("leaves English-only intents without a lone self-referencing alternate", () => {
    for (const id of ["anonymous-image-hosting", "expiring-image-link"] as const) {
      expect(intentLocales(id)).toEqual(["en"]);
      expect(intentAlternateLinks(id)).toEqual([]);
    }
  });

  it("exposes every locale variant to the sitemap without duplicates", () => {
    const urls = allIntentUrls();
    expect(urls).toContain("https://dropimg.io/es/imagen-a-url");
    expect(urls).toContain("https://dropimg.io/pt-br/imagem-para-url");
    expect(urls).toContain("https://dropimg.io/es/captura-de-pantalla-a-enlace");
    expect(urls).toContain("https://dropimg.io/pt-br/colar-print-online");
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(8);
  });
});

describe("intent page rendering", () => {
  const pages = INTENT_PAGE_IDS.flatMap((id) =>
    intentLocales(id).map((locale) => [id, locale] as const),
  );

  it.each(pages)("%s [%s] is a complete acquisition page", (id, locale) => {
    const html = renderIntentPage(id, locale);
    const copy = intentPageCopy(id, locale);

    expect(html).toContain(`lang="${LOCALE_CONFIG[locale].htmlLang}"`);
    expect(html).toContain(`data-locale="${locale}"`);
    expect(html).toContain(
      `<link rel="canonical" href="${intentPageUrl(id, locale)}" />`,
    );
    expect(html).not.toMatch(/name="robots" content="[^"]*noindex/);

    // Uploader above the fold, before the article.
    expect(html).toContain('id="dropzone"');
    expect(html.indexOf('id="dropzone"')).toBeLessThan(
      html.indexOf("seo-article"),
    );
    expect(html).toContain('id="expiry-choice"');

    const h1s = html.match(/<h1[^>]*>([^<]*)<\/h1>/g) ?? [];
    expect(h1s).toHaveLength(1);
    expect(html).toContain(`<h1 class="tagline">${copy.h1}</h1>`);

    expect(html).toContain(copy.stepsHeading);
    expect(html).toContain(copy.faqHeading);
    for (const faq of copy.faqs) expect(html).toContain(faq.q);
  });

  it.each(pages)("%s [%s] emits HowTo and FAQPage schema", (id, locale) => {
    const html = renderIntentPage(id, locale);
    const copy = intentPageCopy(id, locale);
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(match).toBeTruthy();

    const graph = JSON.parse(match![1]!)["@graph"] as Record<string, unknown>[];
    const howto = graph.find((n) => n["@type"] === "HowTo")!;
    const faq = graph.find((n) => n["@type"] === "FAQPage")!;

    expect(howto.inLanguage).toBe(LOCALE_CONFIG[locale].htmlLang);
    expect(howto["@id"]).toBe(`${intentPageUrl(id, locale)}#howto`);
    expect(howto.step).toHaveLength(3);
    expect(faq.mainEntity).toHaveLength(copy.faqs.length);
  });

  it.each(pages)("%s [%s] carries only its own cluster's hreflang", (id, locale) => {
    const html = renderIntentPage(id, locale);
    const tags = html.match(/rel="alternate" hreflang="[^"]*"/g) ?? [];
    expect(tags).toHaveLength(intentAlternateLinks(id).length);
    for (const link of intentAlternateLinks(id)) {
      expect(html).toContain(
        `<link rel="alternate" hreflang="${link.hreflang}" href="${link.href}" />`,
      );
    }
  });

  it("writes native copy rather than repeating the English page", () => {
    for (const id of CLUSTERED) {
      const en = intentPageCopy(id, "en");
      for (const locale of ["es", "pt-BR"] as const) {
        const copy = intentPageCopy(id, locale);
        expect(copy.h1).not.toBe(en.h1);
        expect(copy.title).not.toBe(en.title);
        expect(copy.description).not.toBe(en.description);
        expect(copy.lede).not.toBe(en.lede);
      }
    }
  });
});

describe("intent copy states the current product truth", () => {
  const all = INTENT_PAGE_IDS.flatMap((id) =>
    intentLocales(id).map((locale) => intentPageCopy(id, locale)),
  );

  function text(copy: (typeof all)[number]): string {
    return [
      copy.title,
      copy.description,
      copy.lede,
      ...copy.steps.flatMap((s) => [s.name, s.detail]),
      ...copy.blocks.flatMap((b) =>
        b.type === "ul" || b.type === "ol" ? b.items : [b.text],
      ),
      ...copy.faqs.flatMap((f) => [f.q, f.a]),
    ].join("\n");
  }

  it("no longer claims a fixed 24-hour lifetime", () => {
    for (const copy of all) {
      expect(text(copy)).not.toMatch(
        /fixed 24-hour|expires? (?:after|in) 24 hours|24-hour default|every upload expires after 24 hours/i,
      );
    }
  });

  it("no longer claims accounts or passwords do not exist", () => {
    for (const copy of all) {
      const body = text(copy);
      expect(body).not.toMatch(/no accounts\b/i);
      expect(body).not.toMatch(/we do not offer user accounts/i);
      expect(body).not.toMatch(/no permanent or password-protected storage/i);
    }
  });

  it("still rules out permanent hosting, in every locale", () => {
    for (const copy of all) {
      expect(text(copy)).toMatch(
        /permanent|forever|permanente|para siempre|para sempre/i,
      );
    }
  });
});
