const PAIRING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Post-login return paths. Only the OAuth consent page and browser-extension
 * pairing approval are allowed — never an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.includes("\n") || raw.includes("\r") || raw.includes("\\")) return null;
  if (raw.startsWith("/oauth/authorize")) return raw;
  const pairing = /^\/connect\/browser\/([^/?#]+)$/.exec(raw);
  if (pairing && PAIRING_ID_RE.test(pairing[1]!)) return raw;
  return null;
}

export function isBrowserPairingId(raw: string | null | undefined): boolean {
  return Boolean(raw && PAIRING_ID_RE.test(raw));
}
