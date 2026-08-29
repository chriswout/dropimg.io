import { SLUG_LENGTH } from "../types";

/** Base58: alphanumeric minus 0, O, I, l */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const RESERVED = new Set([
  "api",
  "i",
  "d",
  "admin",
  "terms",
  "privacy",
  "abuse",
  "dmca",
  "assets",
  "static",
  "favicon",
  "robots",
  "sitemap",
  "health",
  "status",
  "login",
  "auth",
  "app",
  "account",
  "pro",
]);

export function generateSlug(length = SLUG_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    // Rejection sampling to avoid modulo bias
    let b = bytes[i]!;
    while (b >= 256 - (256 % ALPHABET.length)) {
      const retry = new Uint8Array(1);
      crypto.getRandomValues(retry);
      b = retry[0]!;
    }
    out += ALPHABET[b % ALPHABET.length]!;
  }
  if (RESERVED.has(out.toLowerCase())) {
    return generateSlug(length);
  }
  return out;
}

export function isValidSlug(slug: string): boolean {
  if (slug.length !== SLUG_LENGTH) return false;
  for (const ch of slug) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return !RESERVED.has(slug.toLowerCase());
}
