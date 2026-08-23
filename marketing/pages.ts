import {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  LOCALES,
  SITE_ORIGIN,
  type Locale,
} from "./locales";

/** Explicit page IDs — never infer translated URLs. */
export const PAGE_IDS = [
  "home",
  "temporary-hosting",
  "paste-screenshot",
  "share-link",
] as const;

export type PageId = (typeof PAGE_IDS)[number];

/** Path per locale (no trailing slash, leading slash except home en = "/"). */
export const PAGE_PATHS: Record<PageId, Record<Locale, string>> = {
  home: {
    en: "/",
    es: "/es",
    "pt-BR": "/pt-br",
    de: "/de",
  },
  "temporary-hosting": {
    en: "/temporary-image-hosting",
    es: "/es/alojamiento-temporal-imagenes",
    "pt-BR": "/pt-br/hospedagem-temporaria-de-imagens",
    de: "/de/temporaeres-bildhosting",
  },
  "paste-screenshot": {
    en: "/paste-screenshot-online",
    es: "/es/pegar-captura-pantalla-online",
    "pt-BR": "/pt-br/colar-captura-de-tela-online",
    de: "/de/screenshot-online-einfuegen",
  },
  "share-link": {
    en: "/share-image-with-link",
    es: "/es/compartir-imagen-con-enlace",
    "pt-BR": "/pt-br/compartilhar-imagem-com-link",
    de: "/de/bild-per-link-teilen",
  },
};

export function pagePath(pageId: PageId, locale: Locale): string {
  return PAGE_PATHS[pageId][locale];
}

export function pageUrl(pageId: PageId, locale: Locale): string {
  const path = pagePath(pageId, locale);
  return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

/** Filesystem directory relative to project root (uses index.html inside). */
export function pageDir(pageId: PageId, locale: Locale): string {
  const path = pagePath(pageId, locale);
  if (path === "/") return ".";
  return path.replace(/^\//, "");
}

export function pathToPageId(pathname: string): PageId | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const key = normalized === "" ? "/" : normalized;
  for (const pageId of PAGE_IDS) {
    for (const locale of LOCALES) {
      if (PAGE_PATHS[pageId][locale] === key) return pageId;
    }
  }
  return null;
}

export function alternateLinks(pageId: PageId): { hreflang: string; href: string }[] {
  const links = LOCALES.map((locale) => ({
    hreflang: LOCALE_CONFIG[locale].hreflang,
    href: pageUrl(pageId, locale),
  }));
  links.push({
    hreflang: "x-default",
    href: pageUrl(pageId, DEFAULT_LOCALE),
  });
  return links;
}

/** All indexable marketing URLs for sitemap / IndexNow. */
export function allMarketingUrls(): string[] {
  const urls: string[] = [];
  for (const pageId of PAGE_IDS) {
    for (const locale of LOCALES) {
      urls.push(pageUrl(pageId, locale));
    }
  }
  return urls;
}
