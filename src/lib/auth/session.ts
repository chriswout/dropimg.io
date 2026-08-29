import { cookieSecure, randomToken, sha256Bytes } from "./crypto";
import { uuid } from "../tokens";

export const SESSION_COOKIE = "dropimg_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  email_norm: string;
  sessionId: string;
};

export async function createSession(
  db: D1Database,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken();
  const tokenHash = await sha256Bytes(token);
  const id = uuid();
  const expiresAt = now + SESSION_TTL_SECONDS;
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, new Uint8Array(tokenHash), now, expiresAt, now)
    .run();
  return { token, expiresAt };
}

export function sessionCookieHeader(
  token: string,
  env: { ENVIRONMENT?: string },
  maxAge = SESSION_TTL_SECONDS,
): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure(env)) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(env: { ENVIRONMENT?: string }): string {
  return sessionCookieHeader("", env, 0);
}

export function readSessionToken(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const m = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(
    cookieHeader,
  );
  return m ? decodeURIComponent(m[1]!) : null;
}

export async function resolveSession(
  db: D1Database,
  cookieHeader: string | null | undefined,
  now = Math.floor(Date.now() / 1000),
): Promise<SessionUser | null> {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const hash = await sha256Bytes(token);
  const row = await db
    .prepare(
      `SELECT s.id as session_id, s.expires_at, s.revoked_at,
              u.id as user_id, u.email, u.email_norm, u.deleted_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
       LIMIT 1`,
    )
    .bind(new Uint8Array(hash))
    .first<{
      session_id: string;
      expires_at: number;
      revoked_at: number | null;
      user_id: string;
      email: string;
      email_norm: string;
      deleted_at: number | null;
    }>();

  if (!row || row.revoked_at || row.deleted_at || row.expires_at < now) {
    return null;
  }

  await db
    .prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`)
    .bind(now, row.session_id)
    .run();

  return {
    id: row.user_id,
    email: row.email,
    email_norm: row.email_norm,
    sessionId: row.session_id,
  };
}

export async function revokeSession(
  db: D1Database,
  sessionId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`,
    )
    .bind(now, sessionId)
    .run();
}

export async function revokeAllSessions(
  db: D1Database,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
    )
    .bind(now, userId)
    .run();
}
