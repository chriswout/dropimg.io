/** Whether the English homepage should offer a locale switch. */
export function shouldOfferLangSuggest(opts: {
  pageLocale: string;
  storedLocale: string | null;
  dismissed: boolean;
  browserMatch: string | null;
}): boolean {
  if (opts.pageLocale !== "en") return false;
  if (opts.storedLocale) return false;
  if (opts.dismissed) return false;
  if (!opts.browserMatch || opts.browserMatch === "en") return false;
  return true;
}
