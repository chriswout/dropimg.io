import { footerHtml, themeBootScript, topBarHtml } from "./chrome";
import { CHROME, HOME, LANDINGS } from "./content";
import { EXTENSION_PAGE, EXTENSION_URL } from "./extension";
import {
  INTENT_PAGES,
  intentPageUrl,
  type IntentPageId,
} from "./intent-pages";
import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  SITE_ORIGIN,
  type Locale,
} from "./locales";
import { alternateLinks, pagePath, pageUrl, type PageId } from "./pages";
import type { LandingCopy, SeoBlock, SharedChrome } from "./types";
import { t } from "./ui";
import { renderAdSlot } from "../src/lib/ads";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hreflangTags(pageId: PageId): string {
  return alternateLinks(pageId)
    .map(
      (l) =>
        `    <link rel="alternate" hreflang="${esc(l.hreflang)}" href="${esc(l.href)}" />`,
    )
    .join("\n");
}

function topBar(pageId: PageId, locale: Locale, chrome: SharedChrome): string {
  return topBarHtml({
    locale,
    chrome,
    langHref: (loc) => pagePath(pageId, loc),
  });
}

function dropzoneHtml(locale: Locale, dropzoneAria: string): string {
  const ui = t(locale);
  return `          <section
            id="dropzone"
            class="dropzone"
            tabindex="0"
            role="button"
            aria-label="${esc(dropzoneAria)}"
          >
            <input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
            />

            <div id="status-live" class="visually-hidden" aria-live="polite"></div>

            <div id="state-idle" class="state">
              <div class="icon-ring" aria-hidden="true">
                <svg viewBox="0 0 64 64" width="40" height="40">
                  <defs>
                    <linearGradient id="iconGrad" x1="8" y1="8" x2="56" y2="56">
                      <stop stop-color="#2563EB" />
                      <stop offset="1" stop-color="#22D3EE" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="10"
                    y="14"
                    width="36"
                    height="28"
                    rx="4"
                    fill="none"
                    stroke="url(#iconGrad)"
                    stroke-width="2.5"
                  />
                  <path
                    d="M18 34l8-8 6 6 4-4 8 8"
                    fill="none"
                    stroke="url(#iconGrad)"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="46" cy="44" r="10" fill="#F59E0B" />
                  <path
                    d="M46 39v7m0 0l-3-3m3 3l3-3"
                    stroke="#0F172A"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
              <p id="idle-title" class="dz-title">
                <span class="idle-desktop">${esc(ui.idleDesktop)}</span>
                <span class="idle-mobile">${esc(ui.idleMobile)}</span>
              </p>
              <p class="dz-hint">
                <span class="hint-desktop"
                  ><kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>V</kbd> ·
                </span>
                ${esc(ui.dropHintFormats)}
              </p>
              <button id="btn-choose" type="button" class="btn primary choose-btn">
                ${esc(ui.chooseImage)}
              </button>
            </div>

            <div id="state-uploading" class="state hidden">
              <img id="preview" class="preview" alt="" />
              <p class="dz-title" data-i18n="uploading">${esc(ui.uploading)}</p>
              <div
                class="progress"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="0"
                id="progress-wrap"
              >
                <div id="progress-bar" class="progress-bar"></div>
              </div>
              <p id="progress-label" class="dz-hint">0%</p>
            </div>

            <div id="state-success" class="state hidden">
              <div class="success-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <p id="success-title" class="dz-title success">${esc(ui.uploadedCopied)}</p>
              <div class="url-row">
                <input id="share-url" class="url-input" readonly aria-label="${esc(ui.shareUrlLabel)}" />
                <button id="btn-copy" type="button" class="btn primary">${esc(ui.copy)}</button>
              </div>
              <p id="expires-label" class="dz-hint"></p>
              <p id="protect-label" class="dz-hint" hidden>${esc(ui.passwordProtected)}</p>
              <div class="actions">
                <a id="btn-open" class="btn secondary" href="#" target="_blank" rel="noopener"
                  >${esc(ui.open)}</a
                >
                <button id="btn-delete" type="button" class="btn danger">
                  ${esc(ui.deleteNow)}
                </button>
                <button id="btn-another" type="button" class="btn secondary">
                  ${esc(ui.uploadAnother)}
                </button>
                <a id="btn-manage" class="btn secondary" href="/app" hidden>${esc(ui.manageInDrops)}</a>
              </div>
              <p id="success-upsell" class="success-upsell" hidden>
                <strong>${esc(ui.needLongerTitle)}</strong>
                ${esc(ui.needLongerBody)}
              </p>
            </div>

            <div id="state-error" class="state hidden">
              <p id="error-title" class="dz-title error">${esc(ui.uploadFailed)}</p>
              <p id="error-message" class="dz-hint"></p>
              <button id="btn-retry" type="button" class="btn primary">${esc(ui.tryAgain)}</button>
            </div>
          </section>
          <div id="pro-options" class="pro-options" hidden>
            <p class="pro-options-kicker">${esc(ui.proControlsKicker)}</p>
            <div class="pro-field">
              <span id="pro-expiry-label">${esc(ui.expiresLabel)}</span>
              <div id="pro-expiry" class="expiry-pills" role="radiogroup" aria-labelledby="pro-expiry-label" data-value="86400">
                <button type="button" class="expiry-pill" role="radio" aria-checked="true" data-expiry="86400">${esc(ui.expiry24h)}</button>
                <button type="button" class="expiry-pill" role="radio" aria-checked="false" data-expiry="604800">${esc(ui.expiry7d)}</button>
                <button type="button" class="expiry-pill" role="radio" aria-checked="false" data-expiry="2592000">${esc(ui.expiry30d)}</button>
              </div>
            </div>
            <div class="pro-field" id="pro-password-wrap">
              <span id="pro-password-label">${esc(ui.passwordLabel)}</span>
              <div class="pro-password-controls">
                <button type="button" id="pro-password-toggle" class="switch" role="switch" aria-checked="false" aria-labelledby="pro-password-label" aria-controls="pro-password" data-off="${esc(ui.passwordOff)}" data-on="${esc(ui.passwordOn)}"></button>
                <input id="pro-password" type="password" minlength="8" placeholder="${esc(ui.passwordPlaceholder)}" autocomplete="new-password" hidden />
              </div>
            </div>
          </div>`;
}

function headMeta(
  pageId: PageId,
  locale: Locale,
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    twitterTitle: string;
    twitterDescription: string;
  },
): string {
  const cfg = LOCALE_CONFIG[locale];
  const url = pageUrl(pageId, locale);
  const robots =
    pageId === "home"
      ? "index, follow, max-image-preview:large"
      : "index, follow";
  return `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(seo.title)}</title>
    <meta name="description" content="${esc(seo.description)}" />
    <link rel="canonical" href="${esc(url)}" />
${hreflangTags(pageId)}
    <meta name="robots" content="${robots}" />
    <meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#07101C" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
${themeBootScript()}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${esc(cfg.ogLocale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(seo.ogTitle)}" />
    <meta property="og:description" content="${esc(seo.ogDescription)}" />
    <meta property="og:site_name" content="dropimg.io" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="dropimg.io" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(seo.twitterTitle)}" />
    <meta name="twitter:description" content="${esc(seo.twitterDescription)}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/og.png" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;
}

function homeJsonLd(locale: Locale, copy: (typeof HOME)[Locale]): string {
  const url = pageUrl("home", locale);
  const lang = LOCALE_CONFIG[locale].htmlLang;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: "dropimg.io",
        url,
        inLanguage: lang,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript for upload UI",
        description: copy.schemaAppDescription,
        image: `${SITE_ORIGIN}/og.png`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: "dropimg.io",
        url,
        inLanguage: lang,
        description: copy.schemaSiteDescription,
        publisher: { "@id": `${SITE_ORIGIN}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#org`,
        name: "dropimg.io",
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/brand/logo-square-512.png`,
      },
      {
        "@type": "HowTo",
        "@id": `${url}#howto`,
        name: copy.schemaHowtoName,
        description: copy.schemaHowtoDescription,
        inLanguage: lang,
        totalTime: "PT1M",
        step: copy.howto.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.detail,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: lang,
        mainEntity: copy.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  const json = JSON.stringify(graph, null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : `      ${line}`))
    .join("\n");
  return `    <script type="application/ld+json">\n      ${json}\n    </script>`;
}

function renderBlocks(blocks: SeoBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "h2") return `          <h2>${esc(b.text)}</h2>`;
      if (b.type === "p") return `          <p>${esc(b.text)}</p>`;
      if (b.type === "ul") {
        const items = b.items.map((i) => `            <li>${esc(i)}</li>`).join("\n");
        return `          <ul>\n${items}\n          </ul>`;
      }
      const items = b.items.map((i) => `            <li>${esc(i)}</li>`).join("\n");
      return `          <ol>\n${items}\n          </ol>`;
    })
    .join("\n\n");
}

function relatedNav(
  pageId: Exclude<PageId, "home">,
  locale: Locale,
  chrome: SharedChrome,
): string {
  const others = (
    ["temporary-hosting", "paste-screenshot", "share-link"] as const
  ).filter((id) => id !== pageId);
  const labels: Record<Exclude<PageId, "home">, string> = {
    "temporary-hosting": chrome.footerSeo.temporary,
    "paste-screenshot": chrome.footerSeo.paste,
    "share-link": chrome.footerSeo.share,
  };
  const links = others
    .map(
      (id) =>
        `          <a href="${esc(pagePath(id, locale))}">${esc(labels[id])}</a>`,
    )
    .join(`\n          <span aria-hidden="true">·</span>\n`);
  return `        <nav class="seo-more" aria-label="${esc(chrome.relatedAria)}">
${links}
          <span aria-hidden="true">·</span>
          <a href="${esc(pagePath("home", locale))}">${esc(chrome.homeLink)}</a>
        </nav>`;
}

function langSuggestBanner(chrome: SharedChrome): string {
  return `      <div id="lang-suggest" class="lang-suggest" hidden>
        <p id="lang-suggest-msg" class="lang-suggest-msg"></p>
        <div class="lang-suggest-actions">
          <a id="lang-suggest-switch" class="btn primary" href="#">${esc(chrome.suggestSwitch)}</a>
          <button id="lang-suggest-dismiss" type="button" class="btn secondary">${esc(chrome.suggestDismiss)}</button>
        </div>
      </div>
      <script type="application/json" id="lang-suggest-data">${JSON.stringify(chrome.langSuggest)}</script>`;
}

/** Subtle post-uploader extension promo — must not dominate the dropzone. */
function extensionPromoHtml(locale: Locale, chrome: SharedChrome): string {
  if (locale !== DEFAULT_LOCALE) {
    // Keep one English store page; still link for other locales
  }
  const label =
    locale === "es"
      ? "También disponible como extensión de Chrome y Edge"
      : locale === "pt-BR"
        ? "Também disponível como extensão Chrome e Edge"
        : locale === "de"
          ? "Auch als Chrome- und Edge-Erweiterung"
          : "Also available as a Chrome / Edge extension";
  return `          <p class="ext-promo">
            <a href="${esc(EXTENSION_URL)}">${esc(label)}</a>
            <span class="visually-hidden"> — ${esc(chrome.footerSeo.extension)}</span>
          </p>`;
}

export function renderHome(locale: Locale): string {
  const copy = HOME[locale];
  const chrome = CHROME[locale];
  const ui = t(locale);
  const cfg = LOCALE_CONFIG[locale];
  const suggest =
    locale === DEFAULT_LOCALE ? `\n${langSuggestBanner(chrome)}\n` : "\n";

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="home">
  <head>
${headMeta("home", locale, copy)}
${homeJsonLd(locale, copy)}
  </head>
  <body>
    <a class="skip-link" href="#dropzone">${esc(chrome.skipToUpload)}</a>
${suggest}    <div class="page">
${topBar("home", locale, chrome)}

      <main>
        <section class="hero" aria-label="Upload">
          <h1 class="tagline">${esc(copy.h1)}</h1>
          <p class="sub">
            ${copy.subHtml}
          </p>

${dropzoneHtml(locale, copy.dropzoneAria)}

          <ul class="trust-chips" aria-label="${esc(chrome.productHighlights)}">
            <li>${esc(copy.trust[0])}</li>
            <li>${esc(copy.trust[1])}</li>
            <li>${esc(copy.trust[2])}</li>
          </ul>

          <section id="recent" class="recent" hidden>
            <h2>${esc(ui.recentDrops)}</h2>
            <ul id="recent-list"></ul>
          </section>

${extensionPromoHtml(locale, chrome)}
        </section>

        <section class="below" aria-label="${esc(chrome.aboutAria)}">
          <section class="howto-compact" aria-labelledby="howto-heading">
            <h2 id="howto-heading">${esc(copy.howtoHeading)}</h2>
            <ol class="flow">
              <li>
                <strong>${esc(copy.howto[0].name)}</strong>
                <span>${esc(copy.howto[0].detail)}</span>
              </li>
              <li>
                <strong>${esc(copy.howto[1].name)}</strong>
                <span>${esc(copy.howto[1].detail)}</span>
              </li>
              <li>
                <strong>${esc(copy.howto[2].name)}</strong>
                <span>${esc(copy.howto[2].detail)}</span>
              </li>
            </ol>
          </section>

          <section class="faq-compact" id="faq" aria-labelledby="faq-heading">
            <h2 id="faq-heading">${esc(copy.faqHeading)}</h2>
            <div class="faq-list">
              <details>
                <summary>${esc(copy.faqs[0].q)}</summary>
                <p>
                  ${esc(copy.faqs[0].a)}
                </p>
              </details>
              <details>
                <summary>${esc(copy.faqs[1].q)}</summary>
                <p>${esc(copy.faqs[1].a)}</p>
              </details>
              <details>
                <summary>${esc(copy.faqs[2].q)}</summary>
                <p>
                  ${esc(copy.faqs[2].a)}
                </p>
              </details>
            </div>
          </section>
        </section>
      </main>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}

export function renderLanding(
  pageId: Exclude<PageId, "home">,
  locale: Locale,
): string {
  const copy: LandingCopy = LANDINGS[pageId][locale];
  const chrome = CHROME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const homeCopy = HOME[locale];

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="${esc(pageId)}">
  <head>
${headMeta(pageId, locale, copy)}
  </head>
  <body>
    <a class="skip-link" href="#dropzone">${esc(chrome.skipToUpload)}</a>
    <div class="page page-seo">
${topBar(pageId, locale, chrome)}

      <main>
        <section class="seo-hero">
          <h1 class="tagline">${esc(copy.h1)}</h1>
          <p class="sub seo-lede">${esc(copy.lede)}</p>

${dropzoneHtml(locale, homeCopy.dropzoneAria)}

          <ul class="trust-chips" aria-label="${esc(chrome.productHighlights)}">
            <li>${esc(homeCopy.trust[0])}</li>
            <li>${esc(homeCopy.trust[1])}</li>
            <li>${esc(homeCopy.trust[2])}</li>
          </ul>

          <section id="recent" class="recent" hidden>
            <h2>${esc(t(locale).recentDrops)}</h2>
            <ul id="recent-list"></ul>
          </section>
        </section>

        <article class="seo-article">
${renderBlocks(copy.blocks)}
        </article>

${renderAdSlot("landing-below-fold")}
${relatedNav(pageId, locale, chrome)}
      </main>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}

export function renderPage(pageId: PageId, locale: Locale): string {
  if (pageId === "home") return renderHome(locale);
  return renderLanding(pageId, locale);
}

/** English-only acquisition page (not in PAGE_IDS / hreflang set). */
export function renderExtensionPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = EXTENSION_PAGE;
  const chrome = CHROME[locale];
  const homeCopy = HOME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = EXTENSION_URL;

  const head = `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#07101C" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
${themeBootScript()}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${esc(cfg.ogLocale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(copy.ogTitle)}" />
    <meta property="og:description" content="${esc(copy.ogDescription)}" />
    <meta property="og:site_name" content="dropimg.io" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="dropimg.io" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(copy.twitterTitle)}" />
    <meta name="twitter:description" content="${esc(copy.twitterDescription)}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/og.png" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="browser-extension">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#dropzone">${esc(chrome.skipToUpload)}</a>
    <div class="page page-seo">
${topBar("home", locale, chrome)}

      <main>
        <section class="seo-hero">
          <h1 class="tagline">${esc(copy.h1)}</h1>
          <p class="sub seo-lede">${esc(copy.lede)}</p>

${dropzoneHtml(locale, homeCopy.dropzoneAria)}

          <ul class="trust-chips" aria-label="${esc(chrome.productHighlights)}">
            <li>${esc(homeCopy.trust[0])}</li>
            <li>${esc(homeCopy.trust[1])}</li>
            <li>${esc(homeCopy.trust[2])}</li>
          </ul>

          <section id="recent" class="recent" hidden>
            <h2>${esc(t(locale).recentDrops)}</h2>
            <ul id="recent-list"></ul>
          </section>
        </section>

        <article class="seo-article">
${renderBlocks(copy.blocks)}
        </article>

        <nav class="seo-more" aria-label="${esc(chrome.relatedAria)}">
          <a href="${esc(pagePath("paste-screenshot", locale))}">${esc(chrome.footerSeo.paste)}</a>
          <span aria-hidden="true">·</span>
          <a href="${esc(pagePath("share-link", locale))}">${esc(chrome.footerSeo.share)}</a>
          <span aria-hidden="true">·</span>
          <a href="${esc(pagePath("home", locale))}">${esc(chrome.homeLink)}</a>
        </nav>
      </main>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}

/** English-only intent landing (uploader above fold, no hreflang set). */
export function renderIntentPage(pageId: IntentPageId): string {
  const locale = DEFAULT_LOCALE;
  const copy = INTENT_PAGES[pageId];
  const chrome = CHROME[locale];
  const homeCopy = HOME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = intentPageUrl(pageId);

  const head = `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#07101C" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
${themeBootScript()}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${esc(cfg.ogLocale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(copy.ogTitle)}" />
    <meta property="og:description" content="${esc(copy.ogDescription)}" />
    <meta property="og:site_name" content="dropimg.io" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="dropimg.io" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(copy.twitterTitle)}" />
    <meta name="twitter:description" content="${esc(copy.twitterDescription)}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/og.png" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="${esc(pageId)}">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#dropzone">${esc(chrome.skipToUpload)}</a>
    <div class="page page-seo">
${topBar("home", locale, chrome)}

      <main>
        <section class="seo-hero">
          <h1 class="tagline">${esc(copy.h1)}</h1>
          <p class="sub seo-lede">${esc(copy.lede)}</p>

${dropzoneHtml(locale, homeCopy.dropzoneAria)}

          <ul class="trust-chips" aria-label="${esc(chrome.productHighlights)}">
            <li>${esc(homeCopy.trust[0])}</li>
            <li>${esc(homeCopy.trust[1])}</li>
            <li>${esc(homeCopy.trust[2])}</li>
          </ul>

          <section id="recent" class="recent" hidden>
            <h2>${esc(t(locale).recentDrops)}</h2>
            <ul id="recent-list"></ul>
          </section>
        </section>

        <article class="seo-article">
${renderBlocks(copy.blocks)}
        </article>

${renderAdSlot("landing-below-fold")}
        <nav class="seo-more" aria-label="${esc(chrome.relatedAria)}">
          <a href="${esc(pagePath("paste-screenshot", locale))}">${esc(chrome.footerSeo.paste)}</a>
          <span aria-hidden="true">·</span>
          <a href="${esc(pagePath("temporary-hosting", locale))}">${esc(chrome.footerSeo.temporary)}</a>
          <span aria-hidden="true">·</span>
          <a href="${esc(pagePath("home", locale))}">${esc(chrome.homeLink)}</a>
        </nav>
      </main>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}
