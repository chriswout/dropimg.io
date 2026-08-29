/**
 * Admin session cookie: short-lived HMAC signed with ADMIN_TOKEN.
 * No accounts / RBAC — single shared secret.
 */

const COOKIE_NAME = "dropimg_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSessionCookie(
  adminToken: string,
  secure: boolean,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const expiresAt = now + SESSION_TTL_SECONDS;
  const sig = await hmacHex(adminToken, `dropimg-admin:${expiresAt}`);
  const value = `${expiresAt}.${sig}`;
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearAdminSessionCookie(secure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function verifyAdminSession(
  adminToken: string,
  cookieHeader: string | null | undefined,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!adminToken || !cookieHeader) return false;
  const match = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(
    cookieHeader,
  );
  if (!match) return false;
  const raw = decodeURIComponent(match[1]!);
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(raw.slice(0, dot));
  const sig = raw.slice(dot + 1);
  if (!Number.isFinite(expiresAt) || expiresAt < now || !sig) return false;
  const expected = await hmacHex(adminToken, `dropimg-admin:${expiresAt}`);
  return timingSafeEqual(sig, expected);
}

export function timingSafeTokenEqual(a: string, b: string): boolean {
  return timingSafeEqual(a, b);
}

export function adminCookieSecure(env: { ENVIRONMENT?: string }): boolean {
  return env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging";
}
