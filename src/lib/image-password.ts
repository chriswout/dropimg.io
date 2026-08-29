import { Buffer } from "node:buffer";
import { pbkdf2 as pbkdf2Callback } from "node:crypto";
import { base64Url, cookieSecure, timingSafeEqualBytes } from "./auth/crypto";

export const PASSWORD_KDF = "pbkdf2-sha256";
/** OWASP PBKDF2-HMAC-SHA256 work factor. Stored on each row. */
export const PASSWORD_ITERATIONS = 600_000;
export const PASSWORD_KEY_LEN = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const UNLOCK_TTL_SECONDS = 60 * 60;

export type ImagePasswordRecord = {
  hash: Uint8Array;
  salt: Uint8Array;
  kdf: typeof PASSWORD_KDF;
  iterations: number;
};

export function imageHasPassword(row: {
  password_hash?: unknown;
  password_salt?: unknown;
}): boolean {
  return Boolean(row.password_hash && row.password_salt);
}

export async function hashImagePassword(
  password: string,
): Promise<ImagePasswordRecord> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2HmacSha256(
    password,
    salt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LEN,
  );
  return {
    hash,
    salt,
    kdf: PASSWORD_KDF,
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyImagePassword(
  password: string,
  stored: { hash: ArrayBuffer; salt: ArrayBuffer; iterations: number },
): Promise<boolean> {
  const iterations = stored.iterations > 0 ? stored.iterations : PASSWORD_ITERATIONS;
  const derived = await pbkdf2HmacSha256(
    password,
    new Uint8Array(stored.salt),
    iterations,
    stored.hash.byteLength || PASSWORD_KEY_LEN,
  );
  return timingSafeEqualBytes(derived, stored.hash);
}

/**
 * Standard PBKDF2-HMAC-SHA256 via node:crypto (nodejs_compat).
 * Staging Worker (2026-08-29, version 62bccb6d) rejected 600_000 iterations:
 * "Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000)."
 * Do not invent a substitute KDF here.
 */
export function pbkdf2HmacSha256(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLen = PASSWORD_KEY_LEN,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    pbkdf2Callback(password, Buffer.from(salt), iterations, keyLen, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(new Uint8Array(key));
    });
  });
}

export function unlockCookieName(slug: string): string {
  return `dropimg_img_${slug}`;
}

export async function signUnlockCookie(
  slug: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const exp = now + UNLOCK_TTL_SECONDS;
  const mac = await hmacSha256(secret, `${slug}:${exp}`);
  return `${exp}.${base64Url(new Uint8Array(mac))}`;
}

export async function unlockCookieValid(
  slug: string,
  cookieHeader: string | null | undefined,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const raw = readCookie(cookieHeader, unlockCookieName(slug));
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot < 1) return false;
  const exp = Number(raw.slice(0, dot));
  const mac = raw.slice(dot + 1);
  if (!Number.isFinite(exp) || exp <= now || !mac) return false;
  const expected = base64Url(new Uint8Array(await hmacSha256(secret, `${slug}:${exp}`)));
  if (expected.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i)! ^ mac.charCodeAt(i)!;
  }
  return diff === 0;
}

export function unlockCookieHeader(
  slug: string,
  value: string,
  env: { ENVIRONMENT?: string },
  maxAge = UNLOCK_TTL_SECONDS,
): string {
  const parts = [
    `${unlockCookieName(slug)}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure(env)) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return null;
}

async function hmacSha256(secret: string, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
}
