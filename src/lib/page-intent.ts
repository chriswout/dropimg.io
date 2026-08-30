/**
 * Strict low-cardinality upload / view attribution.
 * Never accept arbitrary URLs or free-form strings.
 */
export const PAGE_INTENTS = [
  "home",
  "temporary-hosting",
  "paste-screenshot",
  "share-link",
  "browser-extension",
  "screenshot-to-link",
  "image-to-url",
  "anonymous-image-hosting",
  "expiring-image-link",
  "pro",
] as const;

export type PageIntent = (typeof PAGE_INTENTS)[number];

const INTENT_SET = new Set<string>(PAGE_INTENTS);

/** Normalize header / client value → allowlisted intent or empty string. */
export function normalizePageIntent(raw: string | null | undefined): string {
  if (!raw) return "";
  const clipped = raw.trim().toLowerCase().slice(0, 64);
  return INTENT_SET.has(clipped) ? clipped : "";
}

export function isPageIntent(value: string): value is PageIntent {
  return INTENT_SET.has(value);
}
