import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  LOCALES,
  SITE_ORIGIN,
  type Locale,
} from "./locales";

/** Worker-rendered product page — localized like other public pages. */
export const PRO_PATHS: Record<Locale, string> = {
  en: "/pro",
  es: "/es/pro",
  "pt-BR": "/pt-br/pro",
  de: "/de/pro",
};

export function proPath(locale: Locale): string {
  return PRO_PATHS[locale];
}

export function proUrl(locale: Locale): string {
  return `${SITE_ORIGIN}${proPath(locale)}`;
}

export function localeFromProPath(pathname: string): Locale | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  for (const locale of LOCALES) {
    if (PRO_PATHS[locale] === normalized) return locale;
  }
  return null;
}

export function proAlternateLinks(): { hreflang: string; href: string }[] {
  const links = LOCALES.map((locale) => ({
    hreflang: LOCALE_CONFIG[locale].hreflang,
    href: proUrl(locale),
  }));
  links.push({ hreflang: "x-default", href: proUrl(DEFAULT_LOCALE) });
  return links;
}

export function allProUrls(): string[] {
  return LOCALES.map((locale) => proUrl(locale));
}

export type ProSeo = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

export const PRO_SEO: Record<Locale, ProSeo> = {
  en: {
    title: "DropIMG Pro — $2.99/month",
    description:
      "More control for people who use DropIMG every day. Keep links up to 90 days, upload larger images, protect shares, and manage uploads across devices.",
    ogTitle: "DropIMG Pro",
    ogDescription:
      "Keep links longer, manage uploads across devices, and protect what you share. $2.99/month or $24.99/year.",
  },
  es: {
    title: "DropIMG Pro — $2.99/mes",
    description:
      "Más control si usas DropIMG a diario. Enlaces de hasta 90 días, archivos más grandes, protección con contraseña e historial en todos tus dispositivos.",
    ogTitle: "DropIMG Pro",
    ogDescription:
      "Enlaces más largos, historial en todos tus dispositivos y protección al compartir. $2.99/mes o $24.99/año.",
  },
  "pt-BR": {
    title: "DropIMG Pro — $2.99/mês",
    description:
      "Mais controle pra quem usa o DropIMG todo dia. Links de até 90 dias, arquivos maiores, senha e histórico em todos os dispositivos.",
    ogTitle: "DropIMG Pro",
    ogDescription:
      "Links mais longos, histórico em todos os dispositivos e proteção ao compartilhar. $2.99/mês ou $24.99/ano.",
  },
  de: {
    title: "DropIMG Pro — $2.99/Monat",
    description:
      "Mehr Kontrolle für alle, die DropIMG täglich nutzen. Links bis 90 Tage, größere Dateien, Passwortschutz und Verlauf auf allen Geräten.",
    ogTitle: "DropIMG Pro",
    ogDescription:
      "Längere Links, Verlauf auf allen Geräten und Schutz beim Teilen. $2.99/Monat oder $24.99/Jahr.",
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function proHeadTags(locale: Locale): string {
  const seo = PRO_SEO[locale];
  const cfg = LOCALE_CONFIG[locale];
  const url = proUrl(locale);
  const alts = proAlternateLinks()
    .map(
      (l) =>
        `    <link rel="alternate" hreflang="${esc(l.hreflang)}" href="${esc(l.href)}" />`,
    )
    .join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DropIMG Pro",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url,
    inLanguage: cfg.htmlLang,
    offers: [
      {
        "@type": "Offer",
        price: "24.99",
        priceCurrency: "USD",
        name: "DropIMG Pro annual",
      },
      {
        "@type": "Offer",
        price: "2.99",
        priceCurrency: "USD",
        name: "DropIMG Pro monthly",
      },
    ],
  };
  return `    <meta name="description" content="${esc(seo.description)}" />
    <link rel="canonical" href="${esc(url)}" />
${alts}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${esc(cfg.ogLocale)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(seo.ogTitle)}" />
    <meta property="og:description" content="${esc(seo.ogDescription)}" />
    <meta property="og:site_name" content="dropimg.io" />
    <meta property="og:image" content="${SITE_ORIGIN}/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(seo.ogTitle)}" />
    <meta name="twitter:description" content="${esc(seo.ogDescription)}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/og.png" />
    <script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}
