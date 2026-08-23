import { CHROME, HOME, LANDINGS } from "./content";
import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  LOCALES,
  SITE_ORIGIN,
  type Locale,
} from "./locales";
import { alternateLinks, pagePath, pageUrl, type PageId } from "./pages";
import type { LandingCopy, SeoBlock, SharedChrome } from "./types";
import { t } from "./ui";

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

function langSwitcher(pageId: PageId, locale: Locale, chrome: SharedChrome): string {
  const cfg = LOCALE_CONFIG[locale];
  const items = LOCALES.map((loc) => {
    const href = pagePath(pageId, loc);
    const label = LOCALE_CONFIG[loc].label;
    const current = loc === locale ? ' aria-current="page"' : "";
    return `            <li><a href="${esc(href)}" hreflang="${esc(LOCALE_CONFIG[loc].hreflang)}" lang="${esc(LOCALE_CONFIG[loc].htmlLang)}"${current}>${esc(label)}</a></li>`;
  }).join("\n");

  return `        <nav class="lang" aria-label="${esc(chrome.langMenuAria)}">
          <details class="lang-details">
            <summary class="lang-summary">
              <span class="lang-globe" aria-hidden="true">🌐</span>
              <span class="lang-label">${esc(cfg.label)}</span>
            </summary>
            <ul class="lang-menu">
${items}
            </ul>
          </details>
        </nav>`;
}

function topBar(pageId: PageId, locale: Locale, chrome: SharedChrome): string {
  const home = pagePath("home", locale);
  return `      <header class="top">
        <a class="brand" href="${esc(home)}" aria-label="${esc(chrome.brandHomeAria)}">
          <img
            class="brand-logo brand-logo-light"
            src="/brand/logo-32.png"
            srcset="/brand/logo-32.png 1x, /brand/logo-64.png 2x"
            width="134"
            height="32"
            alt="dropimg.io"
            decoding="async"
          />
          <img
            class="brand-logo brand-logo-dark"
            src="/brand/logo-dark-32.png"
            srcset="/brand/logo-dark-32.png 1x, /brand/logo-dark-64.png 2x"
            width="134"
            height="32"
            alt=""
            decoding="async"
            aria-hidden="true"
          />
        </a>
${langSwitcher(pageId, locale, chrome)}
      </header>`;
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
              </div>
            </div>

            <div id="state-error" class="state hidden">
              <p id="error-title" class="dz-title error">${esc(ui.uploadFailed)}</p>
              <p id="error-message" class="dz-hint"></p>
              <button id="btn-retry" type="button" class="btn primary">${esc(ui.tryAgain)}</button>
            </div>
          </section>`;
}

function footerHtml(locale: Locale, chrome: SharedChrome): string {
  return `      <footer class="foot">
        <div class="foot-legal">
          <a href="/privacy.html">${esc(chrome.privacy)}</a>
          <span aria-hidden="true">·</span>
          <a href="/terms.html">${esc(chrome.terms)}</a>
          <span aria-hidden="true">·</span>
          <a href="/abuse">${esc(chrome.abuse)}</a>
        </div>
        <nav class="foot-seo" aria-label="${esc(chrome.learnMoreAria)}">
          <a href="${esc(pagePath("temporary-hosting", locale))}">${esc(chrome.footerSeo.temporary)}</a>
          <a href="${esc(pagePath("paste-screenshot", locale))}">${esc(chrome.footerSeo.paste)}</a>
          <a href="${esc(pagePath("share-link", locale))}">${esc(chrome.footerSeo.share)}</a>
        </nav>
      </footer>`;
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

export function renderHome(locale: Locale): string {
  const copy = HOME[locale];
  const chrome = CHROME[locale];
  const ui = t(locale);
  const cfg = LOCALE_CONFIG[locale];
  const suggest =
    locale === DEFAULT_LOCALE ? `\n${langSuggestBanner(chrome)}\n` : "\n";

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}">
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
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}">
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
