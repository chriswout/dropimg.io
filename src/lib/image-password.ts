import { Buffer } from "node:buffer";
import { scrypt as scryptCallback } from "node:crypto";
import { base64Url, cookieSecure, timingSafeEqualBytes } from "./auth/crypto";

/** Versioned native scrypt. Do not reuse this label for any other KDF. */
export const PASSWORD_KDF = "scrypt-v1";
/** Legacy staging label. Verification must fail closed for this value. */
export const PASSWORD_KDF_PBKDF2 = "pbkdf2-sha256";

/** OWASP scrypt profile: N=2^14, r=8, p=5. */
export const SCRYPT_N = 16384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 5;
export const SCRYPT_KEY_LEN = 32;
export const SCRYPT_SALT_LEN = 16;
/** Node scrypt maxmem; ~128 * N * r = 16 MiB for the adopted profile. */
export const SCRYPT_MAXMEM = 32 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 8;
export const UNLOCK_TTL_SECONDS = 60 * 60;

export type ImagePasswordRecord = {
  hash: Uint8Array;
  salt: Uint8Array;
  kdf: typeof PASSWORD_KDF;
  cost: number;
  blockSize: number;
  parallelization: number;
};

export type StoredImagePassword = {
  hash: ArrayBuffer;
  salt: ArrayBuffer;
  kdf?: string | null;
  cost?: number | null;
  blockSize?: number | null;
  parallelization?: number | null;
};

export function imageHasPassword(row: {
  password_hash?: unknown;
  password_salt?: unknown;
}): boolean {
  return Boolean(row.password_hash && row.password_salt);
}

export function scryptParamsOk(N: number, r: number, p: number): boolean {
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (N < 2 || (N & (N - 1)) !== 0) return false;
  if (r < 1 || r > 32 || p < 1 || p > 16) return false;
  if (N > 1 << 16) return false;
  return 128 * N * r <= SCRYPT_MAXMEM;
}

export function isStoredScryptV1(row: {
  password_kdf?: string | null;
  password_cost?: number | null;
  password_block_size?: number | null;
  password_parallelization?: number | null;
}): boolean {
  return (
    row.password_kdf === PASSWORD_KDF &&
    scryptParamsOk(
      Number(row.password_cost),
      Number(row.password_block_size),
      Number(row.password_parallelization),
    )
  );
}

export async function hashImagePassword(
  password: string,
): Promise<ImagePasswordRecord> {
  const salt = new Uint8Array(SCRYPT_SALT_LEN);
  crypto.getRandomValues(salt);
  const hash = await scryptDerive(password, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    keyLen: SCRYPT_KEY_LEN,
  });
  return {
    hash,
    salt,
    kdf: PASSWORD_KDF,
    cost: SCRYPT_N,
    blockSize: SCRYPT_R,
    parallelization: SCRYPT_P,
  };
}

export async function verifyImagePassword(
  password: string,
  stored: StoredImagePassword,
): Promise<boolean> {
  if (stored.kdf !== PASSWORD_KDF) return false;
  const N = Number(stored.cost);
  const r = Number(stored.blockSize);
  const p = Number(stored.parallelization);
  if (!scryptParamsOk(N, r, p)) return false;
  const salt = new Uint8Array(stored.salt);
  if (salt.byteLength < SCRYPT_SALT_LEN) return false;
  const keyLen = stored.hash.byteLength || SCRYPT_KEY_LEN;
  try {
    const derived = await scryptDerive(password, salt, { N, r, p, keyLen });
    return timingSafeEqualBytes(
      derived.buffer.slice(derived.byteOffset, derived.byteOffset + derived.byteLength) as ArrayBuffer,
      stored.hash,
    );
  } catch {
    return false;
  }
}

/**
 * Asynchronous node:crypto scrypt. Not a JS implementation.
 */
export function scryptDerive(
  password: string,
  salt: Uint8Array,
  opts: { N: number; r: number; p: number; keyLen: number },
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      Buffer.from(salt),
      opts.keyLen,
      { N: opts.N, r: opts.r, p: opts.p, maxmem: SCRYPT_MAXMEM },
      (err, key) => {
        if (err) reject(err);
        else resolve(new Uint8Array(key));
      },
    );
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
