/** Locale registry — extend here when adding fr/ja/etc. */

export const LOCALES = ["en", "es", "pt-BR", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export type LocaleConfig = {
  code: Locale;
  htmlLang: string;
  hreflang: string;
  /** URL path prefix without trailing slash. Empty for English. */
  prefix: string;
  /** Directory segment for generated files. Empty for English. */
  dir: string;
  label: string;
  ogLocale: string;
};

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  en: {
    code: "en",
    htmlLang: "en",
    hreflang: "en",
    prefix: "",
    dir: "",
    label: "English",
    ogLocale: "en_US",
  },
  es: {
    code: "es",
    htmlLang: "es",
    hreflang: "es",
    prefix: "/es",
    dir: "es",
    label: "Español",
    ogLocale: "es_ES",
  },
  "pt-BR": {
    code: "pt-BR",
    htmlLang: "pt-BR",
    hreflang: "pt-BR",
    prefix: "/pt-br",
    dir: "pt-br",
    label: "Português (Brasil)",
    ogLocale: "pt_BR",
  },
  de: {
    code: "de",
    htmlLang: "de",
    hreflang: "de",
    prefix: "/de",
    dir: "de",
    label: "Deutsch",
    ogLocale: "de_DE",
  },
};

export const DEFAULT_LOCALE: Locale = "en";
export const SITE_ORIGIN = "https://dropimg.io";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Map browser language tags → our locales. */
export function matchBrowserLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  if (lower.startsWith("pt-br") || lower === "pt") return "pt-BR";
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("de")) return "de";
  return null;
}
