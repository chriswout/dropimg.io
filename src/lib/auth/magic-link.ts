import { randomToken, sha256Bytes } from "./crypto";
import { uuid } from "../tokens";

export const MAGIC_TTL_SECONDS = 15 * 60;
export const EMAIL_COOLDOWN_SECONDS = 60;
export const ROLLING_WINDOW_SECONDS = 15 * 60;
export const ROLLING_EMAIL_LIMIT = 5;
export const ROLLING_IP_LIMIT = 10;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** c***@example.com — never log or return the full local part. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0]}***@${domain}`;
}

export type AuthRateLimitResult =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "email_window" | "ip_window" };

export async function checkAuthD1Limits(
  db: D1Database,
  emailNorm: string,
  ipHash: string,
  now = Math.floor(Date.now() / 1000),
): Promise<AuthRateLimitResult> {
  const since = now - ROLLING_WINDOW_SECONDS;

  const last = await db
    .prepare(
      `SELECT created_at FROM magic_links
       WHERE email_norm = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(emailNorm)
    .first<{ created_at: number }>();
  if (last && now - last.created_at < EMAIL_COOLDOWN_SECONDS) {
    return { ok: false, reason: "cooldown" };
  }

  const emailCount = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM magic_links
       WHERE email_norm = ? AND created_at >= ?`,
    )
    .bind(emailNorm, since)
    .first<{ cnt: number }>();
  if ((emailCount?.cnt ?? 0) >= ROLLING_EMAIL_LIMIT) {
    return { ok: false, reason: "email_window" };
  }

  const ipCount = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM magic_links
       WHERE ip_hash = ? AND created_at >= ?`,
    )
    .bind(ipHash, since)
    .first<{ cnt: number }>();
  if ((ipCount?.cnt ?? 0) >= ROLLING_IP_LIMIT) {
    return { ok: false, reason: "ip_window" };
  }

  return { ok: true };
}

export async function insertMagicLink(
  db: D1Database,
  emailNorm: string,
  ipHash: string,
  now = Math.floor(Date.now() / 1000),
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken();
  const tokenHash = await sha256Bytes(token);
  await db
    .prepare(
      `INSERT INTO magic_links
        (id, email_norm, token_hash, created_at, expires_at, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      uuid(),
      emailNorm,
      new Uint8Array(tokenHash),
      now,
      now + MAGIC_TTL_SECONDS,
      ipHash,
    )
    .run();
  return { token, expiresAt: now + MAGIC_TTL_SECONDS };
}

export type MagicRow = {
  id: string;
  email_norm: string;
  expires_at: number;
  used_at: number | null;
};

export async function consumeMagicLink(
  db: D1Database,
  token: string,
  now = Math.floor(Date.now() / 1000),
): Promise<{ ok: true; emailNorm: string } | { ok: false }> {
  const hash = await sha256Bytes(token);
  const row = await db
    .prepare(
      `SELECT id, email_norm, expires_at, used_at
       FROM magic_links WHERE token_hash = ? LIMIT 1`,
    )
    .bind(new Uint8Array(hash))
    .first<MagicRow>();

  if (!row || row.used_at || row.expires_at < now) {
    return { ok: false };
  }

  const used = await db
    .prepare(
      `UPDATE magic_links SET used_at = ?
       WHERE id = ? AND used_at IS NULL`,
    )
    .bind(now, row.id)
    .run();

  if (!used.meta.changes) return { ok: false };
  return { ok: true, emailNorm: row.email_norm };
}

export async function findOrCreateUser(
  db: D1Database,
  emailNorm: string,
  now = Math.floor(Date.now() / 1000),
): Promise<{ id: string; email: string } | null> {
  const existing = await db
    .prepare(
      `SELECT id, email, deleted_at FROM users WHERE email_norm = ? LIMIT 1`,
    )
    .bind(emailNorm)
    .first<{ id: string; email: string; deleted_at: number | null }>();

  if (existing) {
    if (existing.deleted_at) return null;
    return { id: existing.id, email: existing.email };
  }

  const id = uuid();
  await db
    .prepare(
      `INSERT INTO users (id, email, email_norm, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, emailNorm, emailNorm, now, now)
    .run();
  return { id, email: emailNorm };
}
