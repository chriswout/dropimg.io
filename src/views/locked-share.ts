import { CHROME } from "../../marketing/content";
import type { Locale } from "../../marketing/locales";
import { DEFAULT_LOCALE, LOCALE_CONFIG } from "../../marketing/locales";

type Copy = {
  title: string;
  heading: string;
  hint: string;
  passwordLabel: string;
  unlock: string;
  wrong: string;
  tryAgain: string;
  report: string;
};

export const LOCKED_COPY: Record<Locale, Copy> = {
  en: {
    title: "Protected image — dropimg.io",
    heading: "This image is protected",
    hint: "Enter the password to view it.",
    passwordLabel: "Password",
    unlock: "Unlock",
    wrong: "Wrong password.",
    tryAgain: "Try again shortly.",
    report: "Report",
  },
  es: {
    title: "Imagen protegida — dropimg.io",
    heading: "Esta imagen está protegida",
    hint: "Escribe la contraseña para verla.",
    passwordLabel: "Contraseña",
    unlock: "Abrir",
    wrong: "Contraseña incorrecta.",
    tryAgain: "Prueba en un momento.",
    report: "Denunciar",
  },
  "pt-BR": {
    title: "Imagem protegida — dropimg.io",
    heading: "Esta imagem está protegida",
    hint: "Digite a senha para ver.",
    passwordLabel: "Senha",
    unlock: "Desbloquear",
    wrong: "Senha errada.",
    tryAgain: "Tente de novo em instantes.",
    report: "Denunciar",
  },
  de: {
    title: "Geschütztes Bild — dropimg.io",
    heading: "Dieses Bild ist geschützt",
    hint: "Passwort eingeben, um es zu sehen.",
    passwordLabel: "Passwort",
    unlock: "Freischalten",
    wrong: "Falsches Passwort.",
    tryAgain: "Bitte gleich nochmal.",
    report: "Melden",
  },
};

export function renderLockedSharePage(opts: {
  slug: string;
  origin: string;
  locale?: Locale;
  error?: string;
}): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const t = LOCKED_COPY[locale];
  const chrome = CHROME[locale];
  const pageUrl = `${opts.origin}/${opts.slug}`;
  const og = `${opts.origin}/og.png`;
  const err = opts.error
    ? `<p class="err" role="alert">${esc(opts.error)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="${esc(LOCALE_CONFIG[locale].htmlLang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(t.title)}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:title" content="${esc(t.heading)}" />
  <meta property="og:image" content="${esc(og)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:image" content="${esc(og)}" />
  <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/site.css" />
</head>
<body class="page-locked">
  <header class="share-top">
    <a class="brand" href="/" aria-label="${esc(chrome.brandHomeAria)}">
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
    <a class="share-report" href="/abuse?slug=${esc(opts.slug)}">${esc(t.report)}</a>
  </header>
  <main class="locked-main">
    <div class="utility-card locked-card">
      <div class="utility-glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
          <circle cx="12" cy="15.6" r="1.1" />
        </svg>
      </div>
      <h1>${esc(t.heading)}</h1>
      <p>${esc(t.hint)}</p>
      ${err}
      <form class="utility-form" method="post" action="/api/i/${esc(opts.slug)}/unlock" autocomplete="current-password">
        <label class="field-label" for="share-password">${esc(t.passwordLabel)}</label>
        <input class="field" id="share-password" type="password" name="password" required minlength="8" autofocus />
        <button class="btn primary btn-lg" type="submit">${esc(t.unlock)}</button>
      </form>
    </div>
  </main>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
