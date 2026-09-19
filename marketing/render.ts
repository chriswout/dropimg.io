import {
  consentScriptTag,
  footerHtml,
  themeBootScript,
  topBarHtml,
} from "./chrome";
import { CHROME, HOME, LANDINGS } from "./content";
import {
  CHROME_WEB_STORE_CTA,
  CHROME_WEB_STORE_URL,
  EXTENSION_PAGE,
  EXTENSION_URL,
} from "./extension";
import { SHAREX_PAGE, SHAREX_URL } from "./sharex";
import {
  AUTH_CARDS,
  DEVELOPERS_CARDS,
  DEVELOPERS_EXAMPLES,
  DEVELOPERS_ONBOARDING,
  DEVELOPERS_PAGE,
  DEVELOPERS_QUICKSTART,
  DROP_FORMATS,
  DROPS_CURL,
  DROPS_LIMIT_ROWS,
  ERROR_CODES,
  ERROR_EXAMPLE,
  MCP_CONFIG,
  MCP_ENDPOINT,
  MCP_TOOL_GROUPS,
  MCP_WORKFLOW,
  REST_CREATE_INTENT,
  REST_CREATE_ORG,
  REST_CREATE_PROJECT,
  REST_REPLACE_INTENT,
  REST_UPLOAD_BYTES,
  UNSUPPORTED_FORMATS,
  WEB_ASSET_FORMATS,
  WEB_ASSETS_LIMIT_ROWS,
  DEVELOPERS_URL,
} from "./developers";
import { DROPS_PAGE, DROPS_URL } from "./drops";
import { MCP_PAGE, MCP_URL } from "./mcp";
import {
  PRICING_COMPARE_ROWS,
  PRICING_PAGE,
  PRICING_TIERS,
  PRICING_URL,
  type PricingTier,
} from "./pricing";
import { WEB_ASSETS_PAGE, WEB_ASSETS_URL } from "./web-assets";
import type { FaqItem as SharexFaq } from "./types";
import {
  INTENT_PAGE_PATHS,
  intentAlternateLinks,
  intentPageCopy,
  intentPageUrl,
  type IntentCopy,
  type IntentPageId,
} from "./intent-pages";
import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  SITE_ORIGIN,
  type Locale,
} from "./locales";
import { alternateLinks, pagePath, pageUrl, type PageId } from "./pages";
import type {
  FaqItem,
  HowToStep,
  LandingCopy,
  SeoBlock,
  SharedChrome,
} from "./types";
import { t, type UiStrings } from "./ui";
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
                <svg class="dz-glyph" viewBox="0 0 24 24" width="34" height="34" fill="none"
                  stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7.3" />
                  <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                  <circle cx="9" cy="9" r="2" />
                  <path class="dz-glyph-arrow" d="M19 22v-6m-3 3 3-3 3 3" />
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
              <p id="upload-phase-title" class="dz-title" data-i18n="uploading">${esc(ui.uploading)}</p>
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
${dropOptionsHtml(ui)}`;
}

/**
 * Lifecycle tray under the dropzone. Rendered with the Free choices already in
 * place so the common case needs no reflow once entitlements resolve; the
 * client widens it for Pro, narrows it when a plan has only one lifetime, and
 * reveals the password row.
 */
function dropOptionsHtml(ui: UiStrings): string {
  const pill = (seconds: number, label: string, pro = false) =>
    `<button type="button" class="expiry-pill" role="radio" aria-checked="${
      seconds === 604800 ? "true" : "false"
    }" tabindex="${seconds === 604800 ? "0" : "-1"}" data-expiry="${seconds}"${
      pro ? " data-pro-only hidden" : ""
    }>${esc(label)}</button>`;

  return `
          <div id="drop-options" class="drop-options">
            <div class="drop-field">
              <span id="expiry-label" class="drop-field-label">${esc(ui.expiresLabel)}</span>
              <div id="expiry-choice" class="expiry-pills" role="radiogroup" aria-labelledby="expiry-label" data-value="604800">
                ${pill(3600, ui.expiry1h)}
                ${pill(86400, ui.expiry24h)}
                ${pill(604800, ui.expiry7d)}
                ${pill(2592000, ui.expiry30d)}
                ${pill(7776000, ui.expiry90d, true)}
                ${pill(15552000, ui.expiry180d, true)}
              </div>
            </div>
            <div class="drop-field" id="pro-password-wrap" hidden>
              <span id="pro-password-label" class="drop-field-label">${esc(ui.passwordLabel)}</span>
              <div class="pro-password-controls">
                <span class="drop-field-badge">${esc(ui.proControlsKicker)}</span>
                <button type="button" id="pro-password-toggle" class="switch" role="switch" aria-checked="false" aria-labelledby="pro-password-label" aria-controls="pro-password"></button>
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
    <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
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
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${consentScriptTag()}`;
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

/** Hairline glyphs for the trust strip, in the same order as `copy.trust`. */
const TRUST_GLYPHS: [string, string, string] = [
  `<path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /><path d="m3 3 18 18" />`,
  `<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" />`,
  `<path d="M12 3.2 5 6v5.4c0 4.3 2.9 8.2 7 9.4 4.1-1.2 7-5.1 7-9.4V6l-7-2.8Z" /><path d="m9.2 12.2 2 2 3.8-4" />`,
];

function trustStripHtml(items: readonly string[], label: string): string {
  const lis = items
    .map(
      (text, i) => `            <li>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                focusable="false">${TRUST_GLYPHS[i]}</svg>
              <span>${esc(text)}</span>
            </li>`,
    )
    .join("\n");
  return `          <ul class="trust-chips" aria-label="${esc(label)}">
${lis}
          </ul>`;
}

/**
 * Thin-stroke vignettes for the three homepage steps. Decorative and
 * `currentColor`-based, so they inherit the theme and cost no requests.
 */
const FLOW_VISUALS: [string, string, string] = [
  `<svg viewBox="0 0 104 64" width="104" height="64" fill="none" stroke="currentColor"
                    stroke-linecap="round" stroke-linejoin="round" focusable="false">
                    <path d="M52 2v13m-5-5 5 5 5-5" stroke-width="1.9" />
                    <rect x="15.5" y="21.5" width="73" height="39" rx="9" stroke-width="1.5"
                      stroke-dasharray="5 4.5" opacity=".5" />
                    <circle cx="35" cy="34" r="3.2" stroke-width="1.5" opacity=".85" />
                    <path d="M23 53l11-10a3.4 3.4 0 0 1 4.6 0L47 51" stroke-width="1.5" opacity=".85" />
                    <path d="M50 47l6.5-6a3.4 3.4 0 0 1 4.6 0L74 53" stroke-width="1.5" opacity=".85" />
                  </svg>`,
  `<svg viewBox="0 0 104 64" width="104" height="64" fill="none" stroke="currentColor"
                    stroke-linecap="round" stroke-linejoin="round" focusable="false">
                    <rect x="4.5" y="21.5" width="70" height="21" rx="10.5" stroke-width="1.5" opacity=".5" />
                    <path d="M15 32h30" stroke-width="2.6" opacity=".4" />
                    <path d="M50 32h13" stroke-width="2.6" opacity=".9" />
                    <rect x="81.5" y="21.5" width="18" height="18" rx="5" stroke-width="1.5" />
                    <path d="m86 30.5 3.2 3.2 6.3-6.4" stroke-width="1.9" />
                  </svg>`,
  `<svg viewBox="0 0 104 64" width="104" height="64" fill="none" stroke="currentColor"
                    stroke-linecap="round" stroke-linejoin="round" focusable="false">
                    <path d="M11 13h50a7 7 0 0 1 7 7v13a7 7 0 0 1-7 7H27l-11 8v-8h-5a7 7 0 0 1-7-7V20a7 7 0 0 1 7-7Z"
                      stroke-width="1.5" opacity=".5" />
                    <path d="M17 24h32" stroke-width="2.2" opacity=".4" />
                    <path d="M17 31h19" stroke-width="2.2" opacity=".85" />
                    <path d="M78 32h18m-6-6 6 6-6 6" stroke-width="1.9" />
                  </svg>`,
];

function flowStepHtml(index: number, step: HowToStep): string {
  const n = String(index + 1).padStart(2, "0");
  return `              <li>
                <span class="flow-step" aria-hidden="true">${n}</span>
                <span class="flow-visual" aria-hidden="true">
                  ${FLOW_VISUALS[index]}
                </span>
                <strong>${esc(step.name)}</strong>
                <span class="flow-detail">${esc(step.detail)}</span>
              </li>`;
}

/**
 * One commercial beat between the steps and the FAQ: expiry is the product,
 * so it gets a headline and a visual rather than another bullet.
 */
function featureMomentHtml(copy: (typeof HOME)[Locale]): string {
  const f = copy.feature;
  return `          <section class="feature-moment" aria-labelledby="feature-heading" data-enter>
            <div class="feature-copy">
              <p class="feature-kicker">${esc(f.kicker)}</p>
              <h2 id="feature-heading" class="feature-title">${esc(f.title)}</h2>
              <p class="feature-body">${esc(f.body)}</p>
            </div>
            <div class="feature-visual">
              <div class="fv-stage">
                <div class="fv-card" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
                    stroke-linecap="round" stroke-linejoin="round" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="9" cy="9.5" r="1.8" />
                    <path d="m4 18 5.2-5.2a2 2 0 0 1 2.8 0L20 21" />
                  </svg>
                </div>
                <div class="fv-timer" aria-hidden="true">
                  <svg viewBox="0 0 48 48" focusable="false">
                    <circle class="fv-timer-track" cx="24" cy="24" r="20" />
                    <circle class="fv-timer-arc" cx="24" cy="24" r="20" />
                  </svg>
                </div>
              </div>
              <p class="feature-note">${esc(f.note)}</p>
            </div>
          </section>`;
}

/**
 * Stylised browser + popup, showing capture → upload → copied link in one
 * frame. Deliberately abstract: no store badges, no real screenshot, nothing
 * that has to be re-rendered when the extension UI changes.
 */
function extensionMockHtml(): string {
  return `          <div class="ext-mock" aria-hidden="true">
            <div class="mock-window">
              <div class="mock-bar">
                <span class="mock-dot"></span>
                <span class="mock-dot"></span>
                <span class="mock-dot"></span>
                <span class="mock-omni"></span>
                <span class="mock-icon">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                    <path d="M3 9V5h4M21 9V5h-4M3 15v4h4M21 15v4h-4" />
                  </svg>
                </span>
              </div>
              <div class="mock-canvas">
                <span class="mock-region"></span>
              </div>
            </div>
            <div class="mock-popup">
              <p class="mock-popup-title">Capture</p>
              <div class="mock-modes">
                <span class="mock-mode is-on">Visible</span>
                <span class="mock-mode">Region</span>
              </div>
              <span class="mock-go">Capture</span>
            </div>
            <div class="mock-toast">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" focusable="false">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              <span class="mock-toast-text">Link copied</span>
              <code class="mock-url">dropimg.io/a7k2x9</code>
            </div>
          </div>`;
}

const HOME_STORY_ASSETS = {
  logo: "https://dropimg.io/m/o9eamt653257/website/marketing/home/logo",
  heroV1: "https://dropimg.io/m/o9eamt653257/website/marketing/home/hero-v1",
  heroV2: "https://dropimg.io/m/o9eamt653257/website/marketing/home/hero-v2",
} as const;

function homepageStoryHtml(copy: (typeof HOME)[Locale]): string {
  return `          <section class="product-demo story-block" aria-labelledby="demo-heading" data-enter>
            <p class="feature-kicker">${esc(copy.agentsHeading)}</p>
            <h2 id="demo-heading">${esc(copy.demoHeading)}</h2>
            <p class="story-body">${esc(copy.storyBody)}</p>
            <div class="story-board">
              <div class="story-site">
                <div class="story-chrome">
                  <img class="story-logo" src="${esc(HOME_STORY_ASSETS.logo)}" width="56" height="56" alt="${esc(copy.storyLogoAlt)}" decoding="async" />
                  <code>${esc(copy.demoUrl)}</code>
                </div>
                <div class="story-swap">
                  <figure>
                    <img src="${esc(HOME_STORY_ASSETS.heroV1)}" width="1280" height="720" alt="${esc(copy.storyHeroV1Alt)}" decoding="async" fetchpriority="high" />
                    <figcaption><span class="stable-v-label">v1</span> <code>${esc(copy.stableV1)}</code></figcaption>
                  </figure>
                  <figure>
                    <img src="${esc(HOME_STORY_ASSETS.heroV2)}" width="1280" height="720" alt="${esc(copy.storyHeroV2Alt)}" decoding="async" />
                    <figcaption><span class="stable-v-label">v2</span> <code>${esc(copy.stableV2)}</code></figcaption>
                  </figure>
                </div>
              </div>
              <div class="story-turns">
                <div class="demo-turn demo-you">
                  <p class="demo-who">${esc(copy.demoYou)}</p>
                  <p class="demo-prompt">${esc(copy.demoPrompt)}</p>
                </div>
                <div class="demo-turn demo-agent">
                  <p class="demo-who">${esc(copy.demoAgent)}</p>
                  <ul class="demo-steps">
                    <li>${esc(copy.demoSteps[0])}</li>
                    <li>${esc(copy.demoSteps[1])}</li>
                    <li>${esc(copy.demoSteps[2])}</li>
                  </ul>
                </div>
                <p class="demo-note">${esc(copy.demoUnchanged)}</p>
              </div>
            </div>
          </section>`;
}

function homepageCompareHtml(copy: (typeof HOME)[Locale]): string {
  return `          <section class="compare-block" aria-labelledby="compare-heading" data-enter>
            <h2 id="compare-heading">${esc(copy.compareHeading)}</h2>
            <div class="compare-grid">
              <article class="compare-card">
                <p class="compare-kicker">${esc(copy.compareDrops)}</p>
                <h3>${esc(copy.compareDropsLead)}</h3>
                <p>${esc(copy.compareDropsBody)}</p>
              </article>
              <article class="compare-card compare-card-media">
                <p class="compare-kicker">${esc(copy.compareMedia)}</p>
                <h3>${esc(copy.compareMediaLead)}</h3>
                <p>${esc(copy.compareMediaBody)}</p>
              </article>
            </div>
          </section>`;
}

function homepageFormatsHtml(copy: (typeof HOME)[Locale]): string {
  const unsupported = copy.formatsUnsupported
    .map((item) => `              <li>${esc(item)}</li>`)
    .join("\n");
  return `          <section class="formats-block" aria-labelledby="formats-heading" data-enter>
            <h2 id="formats-heading">${esc(copy.formatsHeading)}</h2>
            <p class="formats-intro">${esc(copy.formatsIntro)}</p>
            <ul class="format-ok">
              <li>${esc(copy.formatsRaster)}</li>
              <li>${esc(copy.formatsVector)}</li>
              <li>${esc(copy.formatsIcons)}</li>
              <li>${esc(copy.formatsFonts)}</li>
            </ul>
            <h3>${esc(copy.formatsUnsupportedHeading)}</h3>
            <ul class="format-no">
${unsupported}
            </ul>
          </section>`;
}

function homepagePricingHtml(copy: (typeof HOME)[Locale]): string {
  const cards = PRICING_TIERS.map((tier) => {
    const period = tier.id === "free" ? "" : "<span>/mo</span>";
    return `            <article class="price-card" data-tier="${esc(tier.id)}">
              <h3>${esc(tier.name)}</h3>
              <p class="price-amount">${esc(tier.price)}${period}</p>
            </article>`;
  }).join("\n");
  return `          <section class="pricing-teaser" aria-labelledby="pricing-heading" data-enter>
            <h2 id="pricing-heading">${esc(copy.pricingHeading)}</h2>
            <div class="price-grid price-teaser">
${cards}
            </div>
            <p class="pricing-teaser-cta">
              <a class="btn secondary" href="/pricing">${esc(copy.pricingCta)}</a>
            </p>
          </section>`;
}

function homepageSecurityHtml(copy: (typeof HOME)[Locale]): string {
  const facts = copy.securityFacts
    .map((item) => `              <li>${esc(item)}</li>`)
    .join("\n");
  return `          <section class="security-block" aria-labelledby="security-heading" data-enter>
            <h2 id="security-heading">${esc(copy.securityHeading)}</h2>
            <ul class="security-facts">
${facts}
            </ul>
            <p class="security-note">${esc(copy.securityPublic)}</p>
          </section>`;
}

function homepageClosingHtml(copy: (typeof HOME)[Locale]): string {
  return `          <section class="home-close" aria-labelledby="closing-heading">
            <h2 id="closing-heading">${esc(copy.closingHeading)}</h2>
            <div class="hero-actions">
              <a class="btn primary" href="/web-assets" data-media-cta="create" data-track="homepage_web_assets_cta">${esc(copy.closingPrimary)}</a>
              <a class="btn secondary" href="/developers">${esc(copy.closingSecondary)}</a>
            </div>
          </section>`;
}

function compareTableHtml(copy: (typeof HOME)[Locale]): string {
  const yes = copy.compareYes;
  const rows = copy.compareRows
    .map((row) => {
      const drops = row.drops ? yes : "";
      const media = row.media ? yes : "";
      return `              <tr>
                <th scope="row">${esc(row.use)}</th>
                <td>${drops ? `<span class="cmp-yes">${esc(drops)}</span>` : `<span class="cmp-no">—</span>`}</td>
                <td>${media ? `<span class="cmp-yes">${esc(media)}</span>` : `<span class="cmp-no">—</span>`}</td>
              </tr>`;
    })
    .join("\n");
  return `            <div class="compare-wrap">
              <table class="compare-table">
                <thead>
                  <tr>
                    <th scope="col">${esc(copy.compareUse)}</th>
                    <th scope="col">${esc(copy.compareDrops)}</th>
                    <th scope="col">${esc(copy.compareMedia)}</th>
                  </tr>
                </thead>
                <tbody>
${rows}
                </tbody>
              </table>
            </div>`;
}

/** Subtle post-uploader extension promo — must not dominate the dropzone. */
function extensionPromoHtml(locale: Locale, chrome: SharedChrome): string {
  const storeCta =
    locale === "es"
      ? "Disponible en Chrome Web Store"
      : locale === "pt-BR"
        ? "Disponível na Chrome Web Store"
        : locale === "de"
          ? "Im Chrome Web Store"
          : CHROME_WEB_STORE_CTA;
  const howLabel =
    locale === "es"
      ? "Cómo funciona"
      : locale === "pt-BR"
        ? "Como funciona"
        : locale === "de"
          ? "So funktioniert’s"
          : "How it works";
  const sharexLabel =
    locale === "es"
      ? "También desde ShareX"
      : locale === "pt-BR"
        ? "Também pelo ShareX"
        : locale === "de"
          ? "Auch über ShareX"
          : "or from ShareX";
  return `          <div class="ext-promo">
            <a class="btn primary" href="${esc(CHROME_WEB_STORE_URL)}" rel="noopener" target="_blank">${esc(storeCta)}</a>
            <p class="ext-promo-more">
              <a href="${esc(EXTENSION_URL)}">${esc(howLabel)}</a>
              <span aria-hidden="true"> · </span>
              <a href="${esc(SHAREX_URL)}">${esc(sharexLabel)}</a>
              <span class="visually-hidden"> — ${esc(chrome.footerSeo.extension)}, ${esc(chrome.footerSeo.sharex)}</span>
            </p>
          </div>`;
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
${suggest}    <div class="page page-home">
${topBar("home", locale, chrome)}

      <main>
        <section class="hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading" class="tagline">
            <span class="tagline-lead">${esc(copy.h1Lead)}</span>
            <span class="tagline-rest">${esc(copy.h1Rest)}</span>
          </h1>
          <p class="sub">
            ${esc(copy.subHtml)}
          </p>
          <div class="hero-actions">
            <a class="btn primary" href="/web-assets" data-media-cta="create" data-track="homepage_web_assets_cta">${esc(copy.primaryCta)}</a>
            <a class="btn secondary" href="#dropzone">${esc(copy.secondaryCta)}</a>
          </div>
          <p class="works-with">${esc(copy.worksWith)}</p>
        </section>

        <div class="home-band home-band-story">
${homepageStoryHtml(copy)}
        </div>

        <div class="home-band home-band-drops">
        <section class="drop-utility" id="drops" aria-labelledby="drop-heading">
          <p class="feature-kicker">${esc(copy.dropKicker)}</p>
          <h2 id="drop-heading" class="drop-heading">${esc(copy.h1)}</h2>

${dropzoneHtml(locale, copy.dropzoneAria)}

${trustStripHtml(copy.trust, chrome.productHighlights)}

          <section id="recent" class="recent" hidden>
            <h2>${esc(ui.recentDrops)}</h2>
            <ul id="recent-list"></ul>
          </section>

${extensionPromoHtml(locale, chrome)}
        </section>
        </div>

        <div class="home-band home-band-detail">
${homepageCompareHtml(copy)}
${homepageFormatsHtml(copy)}
${homepagePricingHtml(copy)}
        </div>

        <div class="home-band home-band-quiet">
${homepageSecurityHtml(copy)}

        <section class="below" aria-label="${esc(chrome.aboutAria)}">
          <section class="faq-compact" id="faq" aria-labelledby="faq-heading" data-enter>
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
        </div>

${homepageClosingHtml(copy)}
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

${trustStripHtml(homeCopy.trust, chrome.productHighlights)}

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
    <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
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
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${consentScriptTag()}`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="browser-extension">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#ext-details">${esc(copy.skip)}</a>
    <div class="page page-seo page-ext">
${topBar("home", locale, chrome)}

      <main>
        <section class="ext-hero">
          <div class="ext-hero-copy">
            <p class="ext-kicker">${esc(copy.heroKicker)}</p>
            <h1 class="ext-title">${esc(copy.heroTitle)}</h1>
            <p class="ext-tagline">${esc(copy.heroTagline)}</p>
            <p class="sub ext-lede">${esc(copy.lede)}</p>
            <ul class="ext-facts">
${copy.heroFacts.map((f) => `              <li>${esc(f)}</li>`).join("\n")}
            </ul>
            <div class="ext-actions">
              <a class="btn primary" href="${esc(copy.storeHref)}" rel="noopener" target="_blank">${esc(copy.storeCta)}</a>
              <a class="btn secondary" href="#ext-details">${esc(copy.detailsCta)}</a>
            </div>
          </div>
${extensionMockHtml()}
        </section>

        <article class="seo-article" id="ext-details" tabindex="-1" aria-label="${esc(copy.detailsHeading)}">
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

export function renderSharexPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = SHAREX_PAGE;
  const chrome = CHROME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = SHAREX_URL;

  const head = `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
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
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${consentScriptTag()}
${sharexJsonLd(copy)}`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="sharex">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#sharex-details">${esc(copy.skip)}</a>
    <div class="page page-seo page-ext">
${topBar("home", locale, chrome)}

      <main>
        <section class="ext-hero ext-hero-solo">
          <div class="ext-hero-copy">
            <p class="ext-kicker">${esc(copy.heroKicker)}</p>
            <h1 class="ext-title">${esc(copy.heroTitle)}</h1>
            <p class="ext-tagline">${esc(copy.heroTagline)}</p>
            <p class="sub ext-lede">${esc(copy.lede)}</p>
            <ul class="ext-facts">
${copy.heroFacts.map((f) => `              <li>${esc(f)}</li>`).join("\n")}
            </ul>
            <div class="ext-actions">
              <a class="btn primary" href="${esc(copy.downloadHref)}" download="dropimg.sxcu">${esc(copy.downloadAnon)}</a>
              <a class="btn secondary" href="${esc(copy.accountHref)}">${esc(copy.accountCta)}</a>
            </div>
            <p class="ext-github"><a href="${esc(copy.githubHref)}" rel="noopener">${esc(copy.githubCta)}</a></p>
          </div>
        </section>

        <article class="seo-article" id="sharex-details" tabindex="-1" aria-label="${esc(copy.detailsHeading)}">
${renderBlocks(copy.blocks)}
        </article>

${faqHtml(copy.faqHeading, copy.faqs)}

        <nav class="seo-more" aria-label="${esc(chrome.relatedAria)}">
          <a href="/browser-extension">${esc(chrome.footerSeo.extension)}</a>
          <span aria-hidden="true">·</span>
          <a href="${esc(pagePath("paste-screenshot", locale))}">${esc(chrome.footerSeo.paste)}</a>
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

function sharexJsonLd(copy: typeof SHAREX_PAGE): string {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SHAREX_URL}#page`,
        url: SHAREX_URL,
        name: copy.title,
        description: copy.description,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: "dropimg.io", url: SITE_ORIGIN },
      },
      {
        "@type": "HowTo",
        "@id": `${SHAREX_URL}#howto`,
        name: copy.schemaHowtoName,
        description: copy.schemaHowtoDescription,
        inLanguage: "en",
        totalTime: "PT1M",
        tool: {
          "@type": "HowToTool",
          name: "ShareX",
          url: "https://getsharex.com/",
        },
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Download the custom uploader",
            text: "Download dropimg.sxcu and double-click it, or import it in ShareX → Destinations → Custom uploader.",
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Set the image destination",
            text: "Set dropimg.io as the ShareX image uploader destination.",
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Capture and copy the URL",
            text: "Capture as usual. ShareX uploads the screenshot to dropimg.io and copies the temporary URL.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SHAREX_URL}#faq`,
        inLanguage: "en",
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

/** Steps + FAQ as HowTo and FAQPage, scoped to this URL. */
function intentJsonLd(
  pageId: IntentPageId,
  locale: Locale,
  copy: IntentCopy,
): string {
  const url = intentPageUrl(pageId, locale);
  const lang = LOCALE_CONFIG[locale].htmlLang;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        "@id": `${url}#howto`,
        name: copy.schemaHowtoName,
        description: copy.schemaHowtoDescription,
        inLanguage: lang,
        totalTime: "PT1M",
        step: copy.steps.map((s, i) => ({
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

function intentStepsHtml(heading: string, steps: readonly HowToStep[]): string {
  return `          <section class="howto-compact" aria-labelledby="intent-howto" data-enter>
            <h2 id="intent-howto">${esc(heading)}</h2>
            <ol class="flow">
${steps.map((step, i) => flowStepHtml(i, step)).join("\n")}
            </ol>
          </section>`;
}

function faqHtml(heading: string, faqs: readonly FaqItem[]): string {
  const items = faqs
    .map(
      (f) => `              <details>
                <summary>${esc(f.q)}</summary>
                <p>${esc(f.a)}</p>
              </details>`,
    )
    .join("\n");
  return `          <section class="faq-compact" id="faq" aria-labelledby="intent-faq" data-enter>
            <h2 id="intent-faq">${esc(heading)}</h2>
            <div class="faq-list">
${items}
            </div>
          </section>`;
}

/** Intent landing: uploader above the fold, then steps, article, and FAQ. */
export function renderIntentPage(
  pageId: IntentPageId,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const copy = intentPageCopy(pageId, locale);
  const chrome = CHROME[locale];
  const homeCopy = HOME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = intentPageUrl(pageId, locale);
  const alternates = intentAlternateLinks(pageId)
    .map(
      (l) =>
        `\n    <link rel="alternate" hreflang="${esc(l.hreflang)}" href="${esc(l.href)}" />`,
    )
    .join("");

  const head = `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.description)}" />
    <link rel="canonical" href="${esc(url)}" />${alternates}
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
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
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${consentScriptTag()}`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="${esc(pageId)}">
  <head>
${head}
${intentJsonLd(pageId, locale, copy)}
  </head>
  <body>
    <a class="skip-link" href="#dropzone">${esc(chrome.skipToUpload)}</a>
    <div class="page page-seo">
${topBarHtml({
    locale,
    chrome,
    langHref: (loc) => intentLangHref(pageId, loc),
  })}

      <main>
        <section class="seo-hero">
          <h1 class="tagline">${esc(copy.h1)}</h1>
          <p class="sub seo-lede">${esc(copy.lede)}</p>

${dropzoneHtml(locale, homeCopy.dropzoneAria)}

${trustStripHtml(homeCopy.trust, chrome.productHighlights)}

          <section id="recent" class="recent" hidden>
            <h2>${esc(t(locale).recentDrops)}</h2>
            <ul id="recent-list"></ul>
          </section>
        </section>

        <section class="below" aria-label="${esc(chrome.aboutAria)}">
${intentStepsHtml(copy.stepsHeading, copy.steps)}

          <article class="seo-article">
${renderBlocks(copy.blocks)}
          </article>

${faqHtml(copy.faqHeading, copy.faqs)}
        </section>

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

function codeBox(lang: string, source: string): string {
  return `<div class="code-box">
            <div class="code-box-bar">
              <span class="code-box-lang">${esc(lang)}</span>
              <button type="button" class="code-copy" data-copy>Copy</button>
            </div>
            <pre class="code-box-pre"><code>${esc(source)}</code></pre>
          </div>`;
}

export function renderDevelopersPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = DEVELOPERS_PAGE;
  const chrome = CHROME[locale];
  const url = DEVELOPERS_URL;

  const cards = DEVELOPERS_CARDS.map(
    (card) => `            <article class="docs-card">
              <p class="docs-badge">${esc(card.kicker)}</p>
              <h3>${esc(card.title)}</h3>
              <p>${esc(card.body)}</p>
              <p class="docs-meta"><code>${esc(card.meta)}</code></p>
              <a class="btn secondary" href="${esc(card.href)}">${esc(card.cta)}</a>
            </article>`,
  ).join("\n");

  const steps = DEVELOPERS_QUICKSTART.map(
    (step) => `            <li class="docs-step">
              <span class="docs-step-n">${esc(step.n)}</span>
              <div>
                <h3>${esc(step.title)}</h3>
                <p>${esc(step.body)}</p>
              </div>
            </li>`,
  ).join("\n");

  const toolGroups = MCP_TOOL_GROUPS.map(
    (group) => `            <article class="docs-tool-card">
              <h3>${esc(group.title)}</h3>
              <ul>${group.tools.map((tool) => `<li><code>${esc(tool)}</code></li>`).join("")}</ul>
            </article>`,
  ).join("\n");

  const authCards = AUTH_CARDS.map(
    (card) => `            <article class="docs-auth-card">
              <h3>${esc(card.title)}</h3>
              <p class="docs-meta"><code>${esc(card.prefix)}</code></p>
              <p>${esc(card.best)}</p>
              <p class="account-muted">${esc(card.note)}</p>
            </article>`,
  ).join("\n");

  const formatChips = (items: string[]) =>
    items.map((item) => `<li>${esc(item)}</li>`).join("");

  const waLimitRows = WEB_ASSETS_LIMIT_ROWS.map(
    (row) => `              <tr>
                <th scope="row">${esc(row.name)}</th>
                <td>${esc(row.projects)}</td>
                <td>${esc(row.storage)}</td>
                <td>${esc(row.deliveries)}</td>
                <td>${esc(row.keys)}</td>
                <td>${esc(row.file)}</td>
              </tr>`,
  ).join("\n");

  const dropLimitRows = DROPS_LIMIT_ROWS.map(
    (row) => `              <tr>
                <th scope="row">${esc(row.name)}</th>
                <td>${esc(row.file)}</td>
                <td>${esc(row.expiry)}</td>
                <td>${esc(row.api)}</td>
              </tr>`,
  ).join("\n");

  const errorRows = ERROR_CODES.map(
    (row) => `              <tr>
                <th scope="row"><code>${esc(row.code)}</code></th>
                <td>${esc(row.meaning)}</td>
              </tr>`,
  ).join("\n");

  const head = extraProductHead(copy, url, {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: "DropIMG Web Assets API",
    url,
    description: copy.description,
    documentation: url,
  });

  return `<!DOCTYPE html>
<html lang="${esc(LOCALE_CONFIG[locale].htmlLang)}" data-locale="${esc(locale)}" data-page-intent="developers">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#quickstart">${esc(copy.skip)}</a>
    <div class="page page-seo page-ext page-docs">
${topBar("home", locale, chrome)}

      <div class="docs-layout">
        <nav class="docs-toc" aria-label="On this page">
          <a href="#overview">Overview</a>
          <a href="#quickstart">Quickstart</a>
          <a href="#mcp">MCP</a>
          <a href="#rest">REST API</a>
          <a href="#auth">Authentication</a>
          <a href="#formats">Formats</a>
          <a href="#limits">Limits</a>
          <a href="#errors">Errors</a>
        </nav>
        <main class="docs-main">
          <section class="docs-hero" id="overview">
            <p class="ext-kicker">${esc(copy.heroKicker)}</p>
            <h1 class="ext-title">${esc(copy.heroTitle)}</h1>
            <p class="sub ext-lede">${esc(copy.lede)}</p>
            <div class="ext-actions">
              <a class="btn primary" href="#mcp">${esc(copy.primaryCta)}</a>
              <a class="btn secondary" href="#rest">${esc(copy.secondaryCta)}</a>
            </div>
          </section>

          <section class="docs-card-row" aria-label="Start here">
${cards}
          </section>

          <section id="quickstart" class="docs-section">
            <h2>${esc(DEVELOPERS_ONBOARDING.heading)}</h2>
            <p>${esc(DEVELOPERS_ONBOARDING.lede)}</p>
            <ol class="docs-steps">
${steps}
            </ol>
            <p class="docs-callout">Replace the asset later and the URL stays unchanged.</p>
            ${codeBox("JSON", MCP_CONFIG)}
          </section>

          <section id="mcp" class="docs-section">
            <div class="docs-heading-row">
              <h2>MCP</h2>
              <span class="docs-badge">Recommended</span>
            </div>
            <p>Cursor and compatible MCP clients can authenticate through OAuth.</p>
            ${codeBox("Endpoint", MCP_ENDPOINT)}
            <p>${esc(DEVELOPERS_ONBOARDING.mcpBody)}</p>
            <div class="docs-tool-grid">
${toolGroups}
            </div>
            <p class="docs-workflow-label">Application code does not change.</p>
            ${codeBox("Workflow", MCP_WORKFLOW)}
            <p><a class="btn primary" href="/mcp" data-track="agent_connect" data-plan="cursor">${esc(DEVELOPERS_ONBOARDING.cursorCta)}</a></p>
          </section>

          <section id="rest" class="docs-section">
            <h2>${esc(copy.detailsHeading)}</h2>
            <div class="docs-tabs" role="tablist" aria-label="REST products">
              <button type="button" class="docs-tab" data-tab="web-assets" aria-pressed="true">Web Assets</button>
              <button type="button" class="docs-tab" data-tab="drops" aria-pressed="false">Drops</button>
            </div>
            <div class="docs-tab-panel" data-panel="web-assets">
              <h3>Create organization</h3>
              <p>REST create is a signed-in session. Prefer the dashboard or MCP <code>create_media_project</code>. Project keys cannot create projects.</p>
              ${codeBox("cURL", REST_CREATE_ORG)}
              <h3>Create project</h3>
              ${codeBox("cURL", REST_CREATE_PROJECT)}
              <h3>Request upload intent</h3>
              <p>POST file bytes to the returned <code>intent.uploadUrl</code> with <code>intent.headers</code>. Do not put bytes in JSON.</p>
              ${codeBox("cURL", REST_CREATE_INTENT)}
              ${codeBox("cURL", REST_UPLOAD_BYTES)}
              <h3>Replace asset</h3>
              <p>Replacement preserves the stable alias. MIME may change.</p>
              ${codeBox("cURL", REST_REPLACE_INTENT)}
              <h3>JavaScript</h3>
              ${codeBox("JavaScript", DEVELOPERS_EXAMPLES.js)}
              <h3>Python</h3>
              ${codeBox("Python", DEVELOPERS_EXAMPLES.python)}
            </div>
            <div class="docs-tab-panel" data-panel="drops" hidden>
              <h2 id="drops-api">Temporary Drops API</h2>
              <p>Upload a screenshot or image and get a short-lived share URL. Multipart field <code>file</code>. This is not the Web Assets quota.</p>
              ${codeBox("cURL", DROPS_CURL)}
              <h3>Response</h3>
              ${codeBox("JSON", copy.responseJson)}
              ${codeBox("JavaScript", DEVELOPERS_EXAMPLES.dropsJs)}
              ${codeBox("Python", DEVELOPERS_EXAMPLES.dropsPython)}
            </div>
            <p class="account-muted"><a href="${esc(copy.specHref)}">${esc(copy.specCta)}</a> · <a href="${esc(copy.accountHref)}">${esc(copy.accountCta)}</a></p>
          </section>

          <section id="auth" class="docs-section">
            <h2>Authentication</h2>
            <div class="docs-card-row">
${authCards}
            </div>
          </section>

          <section id="formats" class="docs-section">
            <h2>Formats</h2>
            <h3>Web Assets</h3>
            <ul class="docs-chips">${formatChips([...WEB_ASSET_FORMATS])}</ul>
            <h3>Drops</h3>
            <ul class="docs-chips">${formatChips([...DROP_FORMATS])}</ul>
            <h3>Unsupported</h3>
            <ul class="docs-chips docs-chips-muted">${formatChips([...UNSUPPORTED_FORMATS])}</ul>
          </section>

          <section id="limits" class="docs-section">
            <h2>Limits</h2>
            <h3>Web Assets limits</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th scope="col">Plan</th>
                    <th scope="col">Projects</th>
                    <th scope="col">Storage</th>
                    <th scope="col">Deliveries</th>
                    <th scope="col">Keys</th>
                    <th scope="col">File</th>
                  </tr>
                </thead>
                <tbody>
${waLimitRows}
                </tbody>
              </table>
            </div>
            <h3>Drops limits</h3>
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th scope="col">Plan</th>
                    <th scope="col">File</th>
                    <th scope="col">Expiry</th>
                    <th scope="col">API / MCP</th>
                  </tr>
                </thead>
                <tbody>
${dropLimitRows}
                </tbody>
              </table>
            </div>
          </section>

          <section id="errors" class="docs-section">
            <h2>Errors</h2>
            ${codeBox("JSON", ERROR_EXAMPLE)}
            <div class="docs-table-wrap">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
${errorRows}
                </tbody>
              </table>
            </div>
          </section>

          <aside class="docs-callout" id="public-urls">
            <p>Web Asset <code>/m/...</code> URLs are public and can be used directly in <code>&lt;img&gt;</code>, favicon links, CSS, and <code>@font-face</code>.</p>
            <p>Knowledge of the URL is sufficient for access. Do not use Web Assets for secrets or confidential files.</p>
          </aside>

${faqHtml(copy.faqHeading, copy.faqs)}

          <nav class="seo-more" aria-label="${esc(chrome.relatedAria)}">
            <a href="/mcp">${esc(chrome.footerSeo.mcp)}</a>
            <span aria-hidden="true">·</span>
            <a href="/sharex">${esc(chrome.footerSeo.sharex)}</a>
            <span aria-hidden="true">·</span>
            <a href="${esc(pagePath("home", locale))}">${esc(chrome.homeLink)}</a>
          </nav>
        </main>
      </div>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}

export function renderMcpPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = MCP_PAGE;
  const chrome = CHROME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = MCP_URL;

  const head = `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="${esc("#F7F7FB")}" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="${esc("#0B0E17")}" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
${themeBootScript()}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${esc(cfg.ogLocale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(copy.ogTitle)}" />
    <meta property="og:description" content="${esc(copy.ogDescription)}" />
    <meta property="og:site_name" content="dropimg.io" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(copy.twitterTitle)}" />
    <meta name="twitter:description" content="${esc(copy.twitterDescription)}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    ${consentScriptTag()}`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="mcp">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#mcp-setup">${esc(copy.skip)}</a>
    <div class="page page-seo page-ext">
${topBar("home", locale, chrome)}

      <main>
        <section class="ext-hero ext-hero-solo">
          <div class="ext-hero-copy">
            <p class="ext-kicker">${esc(copy.heroKicker)}</p>
            <h1 class="ext-title">${esc(copy.heroTitle)}</h1>
            <p class="ext-tagline">${esc(copy.heroTagline)}</p>
            <p class="sub ext-lede">${esc(copy.lede)}</p>
            <ul class="ext-facts">
${copy.heroFacts.map((f) => `              <li>${esc(f)}</li>`).join("\n")}
            </ul>
            <div class="ext-actions">
              <a class="btn primary" href="${esc(copy.accountHref)}" rel="noopener" target="_blank">${esc(copy.accountCta)}</a>
              <a class="btn secondary" href="${esc(copy.docsHref)}">${esc(copy.docsCta)}</a>
            </div>
          </div>
        </section>

        <article class="seo-article" id="mcp-setup" tabindex="-1" aria-label="${esc(copy.detailsHeading)}">
${renderBlocks(copy.blocks)}
          <h2>${esc(copy.claudeHeading)}</h2>
          <pre class="mcp-snippet"><code>${esc(copy.claudeSnippet)}</code></pre>
        </article>

${faqHtml(copy.faqHeading, copy.faqs)}

        <nav class="seo-more" aria-label="${esc(chrome.relatedAria)}">
          <a href="/developers">${esc(chrome.footerSeo.api)}</a>
          <span aria-hidden="true">·</span>
          <a href="/sharex">${esc(chrome.footerSeo.sharex)}</a>
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

function extraProductHead(copy: {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}, url: string, jsonLd?: unknown): string {
  const cfg = LOCALE_CONFIG[DEFAULT_LOCALE];
  const ld = jsonLd
    ? `\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    : "";
  return `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
${themeBootScript()}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${esc(cfg.ogLocale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(copy.ogTitle)}" />
    <meta property="og:description" content="${esc(copy.ogDescription)}" />
    <meta property="og:site_name" content="dropimg.io" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(copy.twitterTitle)}" />
    <meta name="twitter:description" content="${esc(copy.twitterDescription)}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    ${consentScriptTag()}${ld}`;
}

export function renderWebAssetsPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = WEB_ASSETS_PAGE;
  const chrome = CHROME[locale];
  const home = HOME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = WEB_ASSETS_URL;
  const supported = copy.formatsSupported
    .map((item) => `              <li>${esc(item)}</li>`)
    .join("\n");
  const unsupported = copy.formatsUnsupported
    .map((item) => `              <li>${esc(item)}</li>`)
    .join("\n");

  const head = extraProductHead(copy, url, {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: copy.h1,
    url,
    description: copy.description,
  });

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="web-assets">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#web-assets">${esc(copy.skip)}</a>
    <div class="page page-seo page-ext page-product">
${topBar("home", locale, chrome)}

      <main id="web-assets">
        <section class="ext-hero ext-hero-solo">
          <div class="ext-hero-copy">
            <p class="ext-kicker">${esc(copy.kicker)}</p>
            <h1 class="ext-title">${esc(copy.h1)}</h1>
            <p class="sub ext-lede">${esc(copy.lede)}</p>
            <div class="ext-actions">
              <a class="btn primary" href="/login?next=/app/media" data-media-cta="create">${esc(copy.createCta)}</a>
              <a class="btn secondary" href="/developers">${esc(copy.connectCta)}</a>
              <a class="btn secondary" href="/drops">${esc(copy.dropCta)}</a>
            </div>
          </div>
        </section>

        <article class="seo-article">
          <h2>${esc(copy.useHeading)}</h2>
          <p>${esc(copy.useBody)}</p>
          <h2>${esc(copy.pathHeading)}</h2>
          <p>${esc(copy.pathBody)}</p>
          <p class="demo-url"><code>${esc(copy.pathExample)}</code></p>
          <h2>${esc(copy.versionHeading)}</h2>
          <p>${esc(copy.versionBody)}</p>
          <h2>${esc(copy.formatsHeading)}</h2>
          <ul>
${supported}
          </ul>
          <h3>${esc(copy.formatsUnsupportedHeading)}</h3>
          <ul>
${unsupported}
          </ul>
          <h2>${esc(copy.agentHeading)}</h2>
          <p>${esc(copy.agentBody)}</p>
          <h2>${esc(copy.restHeading)}</h2>
          <p>${esc(copy.restBody)}</p>
          <h2>${esc(copy.mcpHeading)}</h2>
          <p>${esc(copy.mcpBody)}</p>
          <h2>${esc(copy.keysHeading)}</h2>
          <p>${esc(copy.keysBody)}</p>
          <h2>${esc(copy.publicHeading)}</h2>
          <p>${esc(copy.publicBody)}</p>
          <h2>${esc(copy.vsHeading)}</h2>
${compareTableHtml(home)}
        </article>

${faqHtml(copy.faqHeading, copy.faqs)}
      </main>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}

function pricingCheckIcon(): string {
  return `<svg class="pricing-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 11.3 3.2 8.1l1.1-1.1 2.1 2.1 5.2-5.3 1.1 1.1z"/></svg>`;
}

function pricingCardHtml(tier: PricingTier, copy: typeof PRICING_PAGE): string {
  const recommended = tier.recommended
    ? `<p class="pricing-badge">${esc(copy.recommended)}</p>`
    : "";
  const metrics = tier.metrics
    .map(
      (metric) => `                <div class="pricing-metric">
                  <span class="pricing-metric-value">${esc(metric.value)}</span>
                  <span class="pricing-metric-label">${esc(metric.label)}</span>
                </div>`,
    )
    .join("\n");
  const includes = tier.includesLabel
    ? `<p class="pricing-includes">${esc(tier.includesLabel)}</p>`
    : "";
  const features = tier.features
    .map(
      (item) =>
        `                <li>${pricingCheckIcon()}<span>${esc(item)}</span></li>`,
    )
    .join("\n");
  const ctaClass =
    tier.id === "developer" ? "primary" : tier.id === "pro" ? "secondary pricing-cta-pro" : "secondary";
  const cta =
    tier.id === "free"
      ? `<a class="btn ${ctaClass} pricing-cta" href="/web-assets" data-media-cta="create" data-track="pricing_plan" data-plan="free">${esc(tier.cta)}</a>`
      : `<button type="button" class="btn ${ctaClass} pricing-cta" data-wa-checkout="${esc(tier.id)}" data-interval="monthly" data-track="pricing_plan" data-plan="${esc(tier.id)}">${esc(tier.cta)}</button>`;
  const annualPrice = tier.annualAmount
    ? `<div class="price-amount" data-interval-view="annual" hidden>
                <span class="price-figure">${esc(tier.annualAmount)}</span>
                <span class="price-period">/month</span>
              </div>
              <p class="price-annual" data-interval-view="annual" hidden>${esc(tier.annualBill ?? tier.annual ?? "")}</p>`
    : "";
  const monthlyAttr = tier.annualAmount ? ` data-interval-view="monthly"` : "";
  return `            <article class="price-card${tier.recommended ? " is-recommended" : ""}" data-tier="${esc(tier.id)}">
              ${recommended}
              <h2>${esc(tier.name)}</h2>
              <p class="price-pos">${esc(tier.positioning)}</p>
              <div class="price-amount"${monthlyAttr}>
                <span class="price-figure">${esc(tier.price)}</span>
                <span class="price-period">${esc(tier.period)}</span>
              </div>
              ${annualPrice}
              <div class="pricing-metrics">
${metrics}
              </div>
              ${includes}
              <ul class="pricing-features">
${features}
              </ul>
              ${cta}
            </article>`;
}

function pricingCompareHtml(copy: typeof PRICING_PAGE): string {
  const rows = PRICING_COMPARE_ROWS.map(
    (row) => `              <tr>
                <th scope="row">${esc(row.feature)}</th>
                <td>${esc(row.free)}</td>
                <td>${esc(row.developer)}</td>
                <td>${esc(row.pro)}</td>
              </tr>`,
  ).join("\n");
  return `        <section class="pricing-compare" aria-labelledby="compare-heading">
          <h2 id="compare-heading">${esc(copy.compareHeading)}</h2>
          <div class="compare-wrap pricing-compare-wrap">
            <table class="compare-table pricing-compare-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Free</th>
                  <th scope="col">Developer</th>
                  <th scope="col">Pro</th>
                </tr>
              </thead>
              <tbody>
${rows}
              </tbody>
            </table>
          </div>
        </section>`;
}

export function renderPricingPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = PRICING_PAGE;
  const chrome = CHROME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = PRICING_URL;
  const cards = PRICING_TIERS.map((tier) => pricingCardHtml(tier, copy)).join("\n");
  const dropFeatures = copy.dropProFeatures
    .map((item) => `                <li>${pricingCheckIcon()}<span>${esc(item)}</span></li>`)
    .join("\n");

  const head = extraProductHead(copy, url);

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="pricing">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#plans">${esc(copy.skip)}</a>
    <div class="page page-seo page-ext page-pricing">
${topBar("home", locale, chrome)}

      <main>
        <section class="pricing-hero">
          <p class="ext-kicker">${esc(copy.kicker)}</p>
          <h1 class="ext-title">${esc(copy.h1)}</h1>
          <p class="sub pricing-lede">${esc(copy.lede)}</p>
          <p class="visually-hidden">${esc(copy.noEgress)} ${esc(copy.noMcpFee)} ${esc(copy.launchNote)}</p>
          <div class="price-interval" role="radiogroup" aria-label="${esc(copy.intervalAria)}">
            <button type="button" role="radio" data-select-interval="monthly" aria-checked="true">${esc(copy.monthly)}</button>
            <button type="button" role="radio" data-select-interval="annual" aria-checked="false">${esc(copy.annual)} <span class="pricing-save">${esc(copy.annualSave)}</span></button>
          </div>
        </section>

        <section id="plans" class="price-grid" aria-label="Web Assets plans">
${cards}
        </section>
        <p id="pricing-billing-status" class="pricing-trust" hidden aria-live="polite"></p>
        <p class="pricing-trust">${esc(copy.trustLine)}</p>

        <aside class="pricing-protect" aria-labelledby="overage-heading">
          <h2 id="overage-heading">${esc(copy.overageHeading)}</h2>
          <p class="pricing-protect-lead">${esc(copy.overageLead)}</p>
          <p>${esc(copy.overageBody)}</p>
          <p class="pricing-protect-note">${esc(copy.overageNote)}</p>
        </aside>

${pricingCompareHtml(copy)}

        <section class="pricing-drops" aria-labelledby="drops-pricing-heading">
          <h2 id="drops-pricing-heading">${esc(copy.dropProHeading)}</h2>
          <article class="pricing-drops-card">
            <div class="pricing-drops-free">
              <h3>${esc(copy.dropFreeName)}</h3>
              <p class="pricing-drops-label">Free</p>
              <p>${esc(copy.dropFreePos)}</p>
            </div>
            <div class="pricing-drops-pro">
              <h3>${esc(copy.dropProName)}</h3>
              <p class="price-amount pricing-drops-price"><span class="price-figure">€2.99</span><span class="price-period">/month</span></p>
              <ul class="pricing-features">
${dropFeatures}
              </ul>
              <a class="btn secondary pricing-cta" href="/pro">${esc(copy.dropProCta)}</a>
            </div>
          </article>
          <p class="pricing-drops-note">${esc(copy.dropProSeparate)}</p>
        </section>

        <div class="pricing-faq">
${faqHtml(copy.faqHeading, copy.faqs)}
        </div>

        <section class="pricing-close" aria-labelledby="pricing-close-heading">
          <h2 id="pricing-close-heading">${esc(copy.closeHeading)}</h2>
          <p>${esc(copy.closeLede)}</p>
          <div class="hero-actions">
            <a class="btn primary" href="/web-assets" data-media-cta="create" data-track="pricing_plan" data-plan="free">${esc(copy.closePrimary)}</a>
            <a class="btn secondary" href="/developers">${esc(copy.closeSecondary)}</a>
          </div>
        </section>
      </main>

${footerHtml(locale, chrome)}
    </div>

    <script type="module" src="/client/main.ts"></script>
  </body>
</html>
`;
}

export function renderDropsPage(): string {
  const locale = DEFAULT_LOCALE;
  const copy = DROPS_PAGE;
  const chrome = CHROME[locale];
  const home = HOME[locale];
  const ui = t(locale);
  const cfg = LOCALE_CONFIG[locale];
  const url = DROPS_URL;
  const head = extraProductHead(copy, url);

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(locale)}" data-page-intent="drops">
  <head>
${head}
  </head>
  <body>
    <a class="skip-link" href="#dropzone">${esc(copy.skip)}</a>
    <div class="page page-home page-drops">
${topBar("home", locale, chrome)}

      <main>
        <section class="hero drop-hero" aria-labelledby="drop-heading">
          <p class="feature-kicker">${esc(copy.kicker)}</p>
          <h1 id="drop-heading" class="tagline">${esc(copy.h1)}</h1>
          <p class="sub">${esc(copy.lede)}</p>
          <p><a href="/web-assets">${esc(copy.webAssetsCta)}</a></p>

${dropzoneHtml(locale, home.dropzoneAria)}

${trustStripHtml(home.trust, chrome.productHighlights)}

          <section id="recent" class="recent" hidden>
            <h2>${esc(ui.recentDrops)}</h2>
            <ul id="recent-list"></ul>
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

/**
 * The language menu offers every locale, so it has to resolve to a real URL
 * even where this intent has no translation — those fall back to the locale
 * home rather than 404ing.
 */
function intentLangHref(pageId: IntentPageId, locale: Locale): string {
  return INTENT_PAGE_PATHS[pageId][locale] ?? pagePath("home", locale);
}
