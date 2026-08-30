/**
 * Picks the unit an expiry countdown should be read in. Shared by the web
 * uploader and the extension popup so a 7-day link never reads as "in 168h" in
 * one place and "in 7 days" in the other. Callers own the wording.
 */
export type ExpiryCountdown =
  | { unit: "soon" }
  | { unit: "minutes"; value: number }
  | { unit: "hours"; value: number }
  | { unit: "days"; value: number };

export function expiryCountdown(
  expiresAt: number,
  now = Date.now(),
): ExpiryCountdown {
  const ms = expiresAt * 1000 - now;
  if (ms <= 0) return { unit: "soon" };

  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return { unit: "minutes", value: Math.max(1, minutes) };

  // 36h rather than 24h so a fresh 24-hour link still reads in hours.
  const hours = Math.round(minutes / 60);
  if (hours < 36) return { unit: "hours", value: hours };

  return { unit: "days", value: Math.round(hours / 24) };
}
