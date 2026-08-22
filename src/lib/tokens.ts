/** Delete-token helpers. Token is returned once; only sha256 hash is stored. */

export function generateDeleteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function hashDeleteToken(token: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(token);
  return crypto.subtle.digest("SHA-256", data);
}

/**
 * Constant-time compare of a provided token against a stored SHA-256 hash.
 * Uses Workers' crypto.subtle.timingSafeEqual when available; otherwise a
 * portable XOR loop (Node unit tests / non-Workers runtimes).
 */
export async function verifyDeleteToken(
  provided: string,
  storedHash: ArrayBuffer,
): Promise<boolean> {
  const providedHash = await hashDeleteToken(provided);
  if (providedHash.byteLength !== storedHash.byteLength) {
    await timingSafeEqual(providedHash, providedHash);
    return false;
  }
  return timingSafeEqual(providedHash, storedHash);
}

function timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (x: ArrayBuffer, y: ArrayBuffer) => boolean;
  };
  if (typeof subtle.timingSafeEqual === "function") {
    return subtle.timingSafeEqual(a, b);
  }
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  if (x.byteLength !== y.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < x.byteLength; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function r2Key(id: string, now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `o/24h/${y}${m}${d}/${id}`;
}
