import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import {
  chromeFor,
  footerHtml,
  themeBootScript,
  topBarHtml,
} from "../../marketing/chrome";
import { securityHeaders } from "../lib/headers";

export function renderSitePage(opts: {
  locale: Locale;
  title: string;
  env: { ENVIRONMENT?: string };
  main: string;
  skipLabel: string;
  stayPath: string;
  langHref?: (loc: Locale) => string;
  extraBody?: string;
  extraHead?: string;
  robots?: "index" | "noindex";
  bodyClass?: string;
  mainClass?: string;
}): string {
  const chrome = chromeFor(opts.locale);
  const cfg = LOCALE_CONFIG[opts.locale];
  const assets = clientAssetTags(opts.env);
  const robots =
    opts.robots === "index" ? "index, follow" : "noindex, nofollow";
  const langHref = opts.langHref ?? ((_loc: Locale) => opts.stayPath);

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}" data-locale="${esc(opts.locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(opts.title)}</title>
    <meta name="robots" content="${robots}" />
    ${opts.extraHead ?? ""}
    <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light dark" />
    ${themeBootScript()}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${assets.head}
  </head>
  <body${opts.bodyClass ? ` class="${esc(opts.bodyClass)}"` : ""}>
    <a class="skip-link" href="#account-main">${esc(opts.skipLabel)}</a>
    <div class="page">
${topBarHtml({
  locale: opts.locale,
  chrome,
  langHref,
})}
      <main id="account-main" class="account-main${opts.mainClass ? ` ${esc(opts.mainClass)}` : ""}">
        ${opts.main}
      </main>
${footerHtml(opts.locale, chrome)}
    </div>
    ${opts.extraBody ?? ""}
    ${assets.body}
  </body>
</html>`;
}

export function siteHtmlResponse(
  html: string,
  status = 200,
  opts: { robots?: "index" | "noindex"; cache?: "public" | "private" } = {},
): Response {
  const robots = opts.robots === "index" ? "index, follow" : "noindex, nofollow";
  const cache =
    opts.cache === "private" || opts.robots !== "index"
      ? "private, no-store"
      : "public, max-age=60";
  return new Response(html, {
    status,
    headers: securityHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cache,
      "X-Robots-Tag": robots,
    }),
  });
}

function clientAssetTags(env: { ENVIRONMENT?: string }): {
  head: string;
  body: string;
} {
  if (env.ENVIRONMENT === "development") {
    return {
      head: "",
      body: `<script type="module" src="/client/main.ts"></script>`,
    };
  }
  return {
    head: `<link rel="stylesheet" href="/site.css" />`,
    body: `<script src="/chrome.js" defer></script>`,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
