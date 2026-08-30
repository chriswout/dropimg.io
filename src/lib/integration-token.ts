import { randomToken, sha256Bytes, timingSafeEqualBytes } from "./auth/crypto";
import { toArrayBuffer } from "./d1-blob";

export const INTEGRATION_TOKEN_PREFIX = "dropimg_it_";
export const INTEGRATION_SCOPE_UPLOAD = "upload";
export const INTEGRATION_LABEL_MIN = 1;
export const INTEGRATION_LABEL_MAX = 50;

export type IntegrationKind = "extension" | "sharex" | "other";

export type IntegrationAuth = {
  userId: string;
  tokenId: string;
  label: string;
  scope: typeof INTEGRATION_SCOPE_UPLOAD;
};

export type IntegrationTokenRow = {
  id: string;
  label: string;
  scope: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
};

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  return match[1]!;
}

export function integrationTokenFormatOk(token: string): boolean {
  if (!token.startsWith(INTEGRATION_TOKEN_PREFIX)) return false;
  const random = token.slice(INTEGRATION_TOKEN_PREFIX.length);
  return random.length >= 22 && random.length <= 128 && /^[A-Za-z0-9_-]+$/.test(random);
}

export function generateIntegrationToken(): string {
  return `${INTEGRATION_TOKEN_PREFIX}${randomToken()}`;
}

export async function hashIntegrationToken(token: string): Promise<ArrayBuffer> {
  return sha256Bytes(token);
}

export function validateIntegrationLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const label = raw.trim();
  if (label.length < INTEGRATION_LABEL_MIN || label.length > INTEGRATION_LABEL_MAX) {
    return null;
  }
  if (/[\u0000-\u001f\u007f<>]/.test(label)) return null;
  return label;
}

export function normalizeIntegrationKind(raw: unknown): IntegrationKind {
  if (raw === "extension" || raw === "sharex") return raw;
  return "other";
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return "***";
  return `${local[0]}***@${domain}`;
}

export function buildSharexConfig(origin: string, token: string): Record<string, unknown> {
  return {
    Version: "15.0.0",
    Name: "dropimg.io (account)",
    DestinationType: "ImageUploader",
    RequestMethod: "POST",
    RequestURL: `${origin.replace(/\/$/, "")}/api/integrations/sharex`,
    Body: "MultipartFormData",
    FileFormName: "file",
    Headers: {
      Authorization: `Bearer ${token}`,
      "X-Dropimg-Client": "sharex",
    },
    Arguments: {
      expiry: "7d",
    },
    URL: "{json:url}",
    ThumbnailURL: "{json:imageUrl}",
    DeletionURL: "{json:deleteUrl}#{json:deleteToken}",
    ErrorMessage: "{json:error}",
  };
}

export async function resolveIntegrationToken(
  request: Request,
  db: D1Database,
  opts?: { waitUntil?: (promise: Promise<unknown>) => void },
): Promise<IntegrationAuth | null> {
  const token = readBearerToken(request);
  if (!token || !integrationTokenFormatOk(token)) return null;

  const hash = await hashIntegrationToken(token);
  const hashHex = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const row = await db
    .prepare(
      `SELECT t.id, t.user_id, t.label, t.scope, t.token_hash, t.revoked_at, u.deleted_at
       FROM integration_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE hex(t.token_hash) = ?
       LIMIT 1`,
    )
    .bind(hashHex)
    .first<{
      id: string;
      user_id: string;
      label: string;
      scope: string;
      token_hash: ArrayBuffer;
      revoked_at: number | null;
      deleted_at: number | null;
    }>();

  if (!row || row.revoked_at || row.deleted_at) return null;
  if (row.scope !== INTEGRATION_SCOPE_UPLOAD) return null;
  const storedHash = toArrayBuffer(row.token_hash);
  if (storedHash && !timingSafeEqualBytes(hash, storedHash)) return null;

  if (opts?.waitUntil) {
    const now = Math.floor(Date.now() / 1000);
    opts.waitUntil(touchLastUsed(db, row.id, now));
  }

  return {
    userId: row.user_id,
    tokenId: row.id,
    label: row.label,
    scope: INTEGRATION_SCOPE_UPLOAD,
  };
}

export async function createIntegrationToken(
  db: D1Database,
  input: { userId: string; label: string; now?: number },
): Promise<{ id: string; token: string; createdAt: number; label: string }> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const token = generateIntegrationToken();
  const id = crypto.randomUUID();
  const hash = await hashIntegrationToken(token);
  await db
    .prepare(
      `INSERT INTO integration_tokens
        (id, user_id, token_hash, label, scope, created_at, last_used_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .bind(id, input.userId, new Uint8Array(hash), input.label, INTEGRATION_SCOPE_UPLOAD, now)
    .run();
  return { id, token, createdAt: now, label: input.label };
}

export async function listIntegrationTokens(
  db: D1Database,
  userId: string,
): Promise<IntegrationTokenRow[]> {
  const rows = await db
    .prepare(
      `SELECT id, label, scope, created_at, last_used_at, revoked_at
       FROM integration_tokens
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<IntegrationTokenRow>();
  return rows.results ?? [];
}

export async function revokeIntegrationToken(
  db: D1Database,
  input: { userId: string; tokenId: string; now?: number },
): Promise<"revoked" | "already" | "missing"> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT id, revoked_at FROM integration_tokens WHERE id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(input.tokenId, input.userId)
    .first<{ id: string; revoked_at: number | null }>();
  if (!row) return "missing";
  if (row.revoked_at) return "already";
  await db
    .prepare(
      `UPDATE integration_tokens SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    )
    .bind(now, input.tokenId, input.userId)
    .run();
  return "revoked";
}

export async function revokeAllIntegrationTokens(
  db: D1Database,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  await db
    .prepare(
      `UPDATE integration_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
    )
    .bind(now, userId)
    .run();
}

async function touchLastUsed(db: D1Database, tokenId: string, now: number): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE integration_tokens SET last_used_at = ? WHERE id = ? AND revoked_at IS NULL`,
      )
      .bind(now, tokenId)
      .run();
  } catch {
    // last_used_at is best-effort; never fail the caller
  }
}

