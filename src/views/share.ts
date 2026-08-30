import { themeBootScript } from "../../marketing/chrome";
import { CHROME } from "../../marketing/content";
import { DEFAULT_LOCALE, LOCALE_CONFIG, type Locale } from "../../marketing/locales";

type ShareCopy = {
  pageTitle: string;
  ogTitle: string;
  imageAlt: string;
  report: string;
  /** `when` is an already-localized relative time such as "in 24 hours". */
  expires: (when: string) => string;
  cta: string;
};

export const SHARE_COPY: Record<Locale, ShareCopy> = {
  en: {
    pageTitle: "Shared image — dropimg.io",
    ogTitle: "Shared image on dropimg.io",
    imageAlt: "Shared image",
    report: "Report",
    expires: (when) => `Expires ${when}`,
    cta: "Paste your screenshot",
  },
  es: {
    pageTitle: "Imagen compartida — dropimg.io",
    ogTitle: "Imagen compartida en dropimg.io",
    imageAlt: "Imagen compartida",
    report: "Denunciar",
    expires: (when) => `Caduca ${when}`,
    cta: "Pega tu captura",
  },
  "pt-BR": {
    pageTitle: "Imagem compartilhada — dropimg.io",
    ogTitle: "Imagem compartilhada no dropimg.io",
    imageAlt: "Imagem compartilhada",
    report: "Denunciar",
    expires: (when) => `Expira ${when}`,
    cta: "Cole seu print",
  },
  de: {
    pageTitle: "Geteiltes Bild — dropimg.io",
    ogTitle: "Geteiltes Bild auf dropimg.io",
    imageAlt: "Geteiltes Bild",
    report: "Melden",
    expires: (when) => `Läuft ${when} ab`,
    cta: "Screenshot einfügen",
  },
};

type ShareProps = {
  slug: string;
  origin: string;
  mime: string;
  width: number | null;
  height: number | null;
  size: number;
  expiresAt: number;
  locale?: Locale;
  /** When true, render a visible ad placeholder on UGC share pages. Default off. */
  adsEnabled?: boolean;
};

export function renderSharePage(p: ShareProps): string {
  const locale = p.locale ?? DEFAULT_LOCALE;
  const t = SHARE_COPY[locale];
  const chrome = CHROME[locale];
  const cfg = LOCALE_CONFIG[locale];
  const imageUrl = `${p.origin}/i/${p.slug}`;
  const pageUrl = `${p.origin}/${p.slug}`;
  const expiresIso = new Date(p.expiresAt * 1000).toISOString();
  const expiresFriendly = formatFriendlyExpiry(p.expiresAt, locale);
  const wh =
    p.width && p.height
      ? ` width="${p.width}" height="${p.height}"`
      : "";
  const reportUrl = `${p.origin}/abuse?slug=${encodeURIComponent(p.slug)}`;

  // Escape the sentence first, then swap a placeholder for the <time> element,
  // so the localized wording can put the timestamp anywhere in the sentence.
  const TIME_SLOT = "\u0000time\u0000";
  const expiresHtml = esc(t.expires(TIME_SLOT)).replace(
    TIME_SLOT,
    `<time datetime="${expiresIso}">${esc(expiresFriendly)}</time>`,
  );

  const adSlotHtml = p.adsEnabled
    ? `<aside class="ad-slot" data-ad-slot="share-below-image" aria-hidden="true"></aside>`
    : `<!-- ad slot share-below-image reserved (disabled) -->`;

  return `<!DOCTYPE html>
<html lang="${esc(cfg.htmlLang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(t.pageTitle)}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:title" content="${esc(t.ogTitle)}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/site.css" />
  ${themeBootScript()}
</head>
<body class="page-share">
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
    <a class="share-report" href="${esc(reportUrl)}">${esc(t.report)}</a>
  </header>
  <main class="share-main">
    <div class="share-frame">
      <img src="${esc(imageUrl)}" alt="${esc(t.imageAlt)}"${wh} loading="eager" decoding="async" />
    </div>
    <p class="share-meta">${expiresHtml}</p>
    <a class="btn primary btn-lg share-cta" id="share-cta" href="/">${esc(t.cta)}</a>
    ${adSlotHtml}
  </main>
  <footer class="share-foot">
    <span>${esc(chrome.footerTagline)}</span>
    <a href="/">dropimg.io</a>
    <a href="/privacy.html">${esc(chrome.privacy)}</a>
  </footer>
  <script>
    (function () {
      var a = document.getElementById("share-cta");
      if (!a) return;
      a.addEventListener("click", function () {
        try {
          navigator.sendBeacon(
            "/api/event",
            new Blob(
              [JSON.stringify({ event: "share_cta_click" })],
              { type: "application/json" },
            ),
          );
        } catch (e) {}
      });
    })();
  </script>
</body>
</html>`;
}

type GoneCopy = {
  deleted: string;
  expired: string;
  missing: string;
  missingBody: string;
  goneBody: string;
  shareNew: string;
};

export const GONE_COPY: Record<Locale, GoneCopy> = {
  en: {
    deleted: "This image was deleted",
    expired: "This image has expired",
    missing: "Image not found",
    missingBody: "No image exists at this link.",
    goneBody: "Temporary images on dropimg.io are automatically removed.",
    shareNew: "Share a new image",
  },
  es: {
    deleted: "Esta imagen fue borrada",
    expired: "Esta imagen caducó",
    missing: "Imagen no encontrada",
    missingBody: "No hay ninguna imagen en este enlace.",
    goneBody: "Las imágenes temporales de dropimg.io se eliminan solas.",
    shareNew: "Compartir otra imagen",
  },
  "pt-BR": {
    deleted: "Esta imagem foi excluída",
    expired: "Esta imagem expirou",
    missing: "Imagem não encontrada",
    missingBody: "Não existe imagem neste link.",
    goneBody: "Imagens temporárias no dropimg.io são removidas automaticamente.",
    shareNew: "Compartilhar outra imagem",
  },
  de: {
    deleted: "Dieses Bild wurde gelöscht",
    expired: "Dieses Bild ist abgelaufen",
    missing: "Bild nicht gefunden",
    missingBody: "Unter diesem Link gibt es kein Bild.",
    goneBody: "Temporäre Bilder auf dropimg.io werden automatisch entfernt.",
    shareNew: "Neues Bild teilen",
  },
};

const GONE_GLYPH: Record<"missing" | "expired" | "deleted", string> = {
  missing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
      </svg>`,
  expired: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7.2V12l3.1 1.9" />
      </svg>`,
  deleted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 7h16" /><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
        <path d="M6.4 7.6 7.2 19a1.6 1.6 0 0 0 1.6 1.5h6.4a1.6 1.6 0 0 0 1.6-1.5l.8-11.4" />
      </svg>`,
};

export function renderGonePage(opts: {
  reason: "missing" | "expired" | "deleted";
  locale?: Locale;
}): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const t = GONE_COPY[locale];
  const title =
    opts.reason === "deleted"
      ? t.deleted
      : opts.reason === "expired"
        ? t.expired
        : t.missing;
  const copy = opts.reason === "missing" ? t.missingBody : t.goneBody;

  return `<!DOCTYPE html>
<html lang="${esc(LOCALE_CONFIG[locale].htmlLang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)} — dropimg.io</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/site.css" />
  ${themeBootScript()}
</head>
<body class="page-utility">
  <main class="utility-card">
    <div class="utility-glyph" aria-hidden="true">${GONE_GLYPH[opts.reason]}</div>
    <h1>${esc(title)}</h1>
    <p>${esc(copy)}</p>
    <div class="utility-actions">
      <a class="btn primary" href="/">${esc(t.shareNew)}</a>
    </div>
  </main>
</body>
</html>`;
}

/** Coarse relative expiry ("in 24 hours", "in 7 days") in the reader's locale. */
function formatFriendlyExpiry(expiresAt: number, locale: Locale): string {
  const ms = expiresAt * 1000 - Date.now();
  const rtf = new Intl.RelativeTimeFormat(LOCALE_CONFIG[locale].htmlLang, {
    numeric: "auto",
  });
  if (ms <= 0) return rtf.format(0, "minute");
  const days = Math.round(ms / 86_400_000);
  if (days >= 2) return rtf.format(days, "day");
  const hours = Math.round(ms / 3_600_000);
  if (hours >= 1) return rtf.format(hours, "hour");
  return rtf.format(Math.max(1, Math.round(ms / 60_000)), "minute");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
