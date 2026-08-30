import { CHROME } from "./content";
import { LOCALE_CONFIG, LOCALES, type Locale } from "./locales";
import { pagePath } from "./pages";
import { proPath } from "./pro";
import type { SharedChrome } from "./types";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function themeBootScript(): string {
  return `<script>
(function(){
  try {
    var t = localStorage.getItem("dropimg:theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
</script>`;
}

export function themeToggleHtml(chrome: SharedChrome): string {
  return `        <button type="button" id="theme-toggle" class="theme-toggle"
          aria-label="${esc(chrome.themeToggleAria)}"
          data-label-light="${esc(chrome.themeToLight)}"
          data-label-dark="${esc(chrome.themeToDark)}">
          <span class="theme-icon theme-icon-moon" aria-hidden="true"></span>
          <span class="theme-icon theme-icon-sun" aria-hidden="true"></span>
        </button>`;
}

export function langSwitcherHtml(
  locale: Locale,
  chrome: SharedChrome,
  langHref: (loc: Locale) => string,
): string {
  const cfg = LOCALE_CONFIG[locale];
  const items = LOCALES.map((loc) => {
    const href = langHref(loc);
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

export function topBarHtml(opts: {
  locale: Locale;
  chrome: SharedChrome;
  langHref: (loc: Locale) => string;
}): string {
  const home = pagePath("home", opts.locale);
  return `      <header class="top">
        <a class="brand" href="${esc(home)}" aria-label="${esc(opts.chrome.brandHomeAria)}">
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
        <div class="header-actions">
          <nav id="account-nav" class="account-nav" aria-label="${esc(opts.chrome.accountAria)}">
            <a id="account-pro-anon" class="account-nav-link account-pro-link" href="${esc(proPath(opts.locale))}">${esc(opts.chrome.proPrice)}</a>
            <a id="account-signin" class="account-chip" href="/login">${esc(opts.chrome.signIn)}</a>
            <div id="account-session" class="account-session" hidden>
              <a id="account-app" class="account-nav-link" href="/app">${esc(opts.chrome.myDrops)}</a>
              <a id="account-plan" class="account-plan" href="${esc(proPath(opts.locale))}" hidden
                data-label-pro="${esc(opts.chrome.pro)}"
                data-label-upgrade="${esc(opts.chrome.upgradeToPro)}"></a>
              <details class="account-menu">
                <summary class="account-chip account-summary">
                  <span id="account-plan-badge" class="account-plan-badge" hidden>${esc(opts.chrome.pro)}</span>
                  <span id="account-email" class="account-email"></span>
                </summary>
                <div class="account-menu-panel">
                  <p id="account-email-full" class="account-email-full"></p>
                  <a id="account-app-menu" class="account-menu-item account-menu-mobile" href="/app">${esc(opts.chrome.myDrops)}</a>
                  <a id="account-plan-menu" class="account-menu-item account-menu-mobile" href="${esc(proPath(opts.locale))}" hidden>${esc(opts.chrome.upgradeToPro)}</a>
                  <a id="account-edit" class="account-menu-item" href="/account">${esc(opts.chrome.editAccount)}</a>
                  <button id="account-signout" type="button" class="account-menu-item">${esc(opts.chrome.signOut)}</button>
                </div>
              </details>
            </div>
          </nav>
${themeToggleHtml(opts.chrome)}
${langSwitcherHtml(opts.locale, opts.chrome, opts.langHref)}
        </div>
      </header>`;
}

export function footerHtml(locale: Locale, chrome: SharedChrome): string {
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
          <a href="/browser-extension">${esc(chrome.footerSeo.extension)}</a>
        </nav>
      </footer>`;
}

export function chromeFor(locale: Locale): SharedChrome {
  return CHROME[locale];
}
