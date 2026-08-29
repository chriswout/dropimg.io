const KNOWN_CLIENTS = new Set([
  "web",
  "chrome-extension",
  "edge-extension",
  "firefox-extension",
  "sharex",
]);

/** Attribute uploads: allowlisted client or `other`. */
export function normalizeUploadClient(raw: string | null | undefined): string {
  if (!raw) return "web";
  const clipped = raw.trim().toLowerCase().slice(0, 40);
  return KNOWN_CLIENTS.has(clipped) ? clipped : "other";
}

export function isKnownUploadClient(value: string): boolean {
  return KNOWN_CLIENTS.has(value);
}
