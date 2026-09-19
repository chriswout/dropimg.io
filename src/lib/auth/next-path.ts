const PAIRING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** First-party app screens marketing CTAs may return to after sign-in. Exact match only. */
const ALLOWED_APP_NEXT = new Set([
  "/app",
  "/app/media",
  "/app/billing",
  "/app/account",
  "/pricing",
]);

/**
 * Post-login return paths. OAuth consent, browser-extension pairing, and a
 * small allowlist of first-party screens — never an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.includes("\n") || raw.includes("\r") || raw.includes("\\")) return null;
  if (raw.startsWith("/oauth/authorize")) return raw;
  const pairing = /^\/connect\/browser\/([^/?#]+)$/.exec(raw);
  if (pairing && PAIRING_ID_RE.test(pairing[1]!)) return raw;
  if (ALLOWED_APP_NEXT.has(raw)) return raw;
  return null;
}

export function isBrowserPairingId(raw: string | null | undefined): boolean {
  return Boolean(raw && PAIRING_ID_RE.test(raw));
}
