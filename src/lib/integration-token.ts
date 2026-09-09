import { randomToken, sha256Bytes, timingSafeEqualBytes } from "./auth/crypto";
import { toArrayBuffer } from "./d1-blob";

export const INTEGRATION_TOKEN_PREFIX = "dropimg_it_";
export const API_TOKEN_PREFIX = "dropimg_api_";
export const INTEGRATION_SCOPE_UPLOAD = "upload";
export const INTEGRATION_LABEL_MIN = 1;
export const INTEGRATION_LABEL_MAX = 50;

export const IMAGE_SCOPES = ["images:write", "images:read", "images:delete"] as const;
export type ImageScope = (typeof IMAGE_SCOPES)[number];
export const DEFAULT_API_SCOPES: ImageScope[] = [...IMAGE_SCOPES];

export type IntegrationKind = "extension" | "sharex" | "api" | "other";

export type IntegrationAuth = {
  userId: string;
  tokenId: string;
  label: string;
  kind: IntegrationKind;
  scopes: ImageScope[];
};

export type IntegrationTokenRow = {
  id: string;
  label: string;
  kind: IntegrationKind;
  scope: string;
  scopes: ImageScope[];
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

function randomLooksOk(random: string): boolean {
  return random.length >= 22 && random.length <= 128 && /^[A-Za-z0-9_-]+$/.test(random);
}

export function integrationTokenFormatOk(token: string): boolean {
  if (!token.startsWith(INTEGRATION_TOKEN_PREFIX)) return false;
  return randomLooksOk(token.slice(INTEGRATION_TOKEN_PREFIX.length));
}

export function apiTokenFormatOk(token: string): boolean {
  if (!token.startsWith(API_TOKEN_PREFIX)) return false;
  return randomLooksOk(token.slice(API_TOKEN_PREFIX.length));
}

export function anyIntegrationTokenFormatOk(token: string): boolean {
  return integrationTokenFormatOk(token) || apiTokenFormatOk(token);
}

export function generateIntegrationToken(): string {
  return `${INTEGRATION_TOKEN_PREFIX}${randomToken()}`;
}

export function generateApiToken(): string {
  return `${API_TOKEN_PREFIX}${randomToken()}`;
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
  if (raw === "extension" || raw === "sharex" || raw === "api") return raw;
  return "other";
}

export function isImageScope(value: unknown): value is ImageScope {
  return value === "images:write" || value === "images:read" || value === "images:delete";
}

export function parseImageScopes(raw: unknown): ImageScope[] | null {
  if (raw == null) return [...DEFAULT_API_SCOPES];
  if (!Array.isArray(raw)) return null;
  const unique = new Set<ImageScope>();
  for (const item of raw) {
    if (!isImageScope(item)) return null;
    unique.add(item);
  }
  if (unique.size === 0) return null;
  return IMAGE_SCOPES.filter((scope) => unique.has(scope));
}

export function scopesFromRow(scope: string, scopesJson: string | null | undefined): ImageScope[] {
  if (scopesJson) {
    try {
      const parsed = JSON.parse(scopesJson) as unknown;
      const scopes = parseImageScopes(parsed);
      if (scopes) return scopes;
    } catch {
      // fall through to legacy mapping
    }
  }
  if (scope === INTEGRATION_SCOPE_UPLOAD) return ["images:write"];
  return [];
}

export function tokenHasScope(auth: IntegrationAuth, scope: ImageScope): boolean {
  return auth.scopes.includes(scope);
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
  if (!token) return null;
  return resolveIntegrationTokenValue(token, db, opts);
}

export async function resolveIntegrationTokenValue(
  token: string,
  db: D1Database,
  opts?: { waitUntil?: (promise: Promise<unknown>) => void },
): Promise<IntegrationAuth | null> {
  if (!anyIntegrationTokenFormatOk(token)) return null;

  const hash = await hashIntegrationToken(token);
  const hashHex = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const row = await db
    .prepare(
      `SELECT t.id, t.user_id, t.label, t.scope, t.scopes, t.kind, t.token_hash, t.revoked_at, u.deleted_at
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
      scopes: string | null;
      kind: string | null;
      token_hash: ArrayBuffer;
      revoked_at: number | null;
      deleted_at: number | null;
    }>();

  if (!row || row.revoked_at || row.deleted_at) return null;
  const scopes = scopesFromRow(row.scope, row.scopes);
  if (scopes.length === 0) return null;
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
    kind: normalizeIntegrationKind(row.kind),
    scopes,
  };
}

export async function createIntegrationToken(
  db: D1Database,
  input: {
    userId: string;
    label: string;
    kind?: IntegrationKind;
    scopes?: ImageScope[];
    now?: number;
  },
): Promise<{
  id: string;
  token: string;
  createdAt: number;
  label: string;
  kind: IntegrationKind;
  scopes: ImageScope[];
}> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const kind = input.kind ?? "other";
  const scopes: ImageScope[] =
    kind === "api" ? (input.scopes?.length ? input.scopes : [...DEFAULT_API_SCOPES]) : ["images:write"];
  const token = kind === "api" ? generateApiToken() : generateIntegrationToken();
  const id = crypto.randomUUID();
  const hash = await hashIntegrationToken(token);
  await db
    .prepare(
      `INSERT INTO integration_tokens
        (id, user_id, token_hash, label, scope, scopes, kind, created_at, last_used_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .bind(
      id,
      input.userId,
      new Uint8Array(hash),
      input.label,
      INTEGRATION_SCOPE_UPLOAD,
      JSON.stringify(scopes),
      kind,
      now,
    )
    .run();
  return { id, token, createdAt: now, label: input.label, kind, scopes };
}

export async function listIntegrationTokens(
  db: D1Database,
  userId: string,
): Promise<IntegrationTokenRow[]> {
  const rows = await db
    .prepare(
      `SELECT id, label, scope, scopes, kind, created_at, last_used_at, revoked_at
       FROM integration_tokens
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<{
      id: string;
      label: string;
      scope: string;
      scopes: string | null;
      kind: string | null;
      created_at: number;
      last_used_at: number | null;
      revoked_at: number | null;
    }>();
  return (rows.results ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    kind: normalizeIntegrationKind(row.kind),
    scope: row.scope,
    scopes: scopesFromRow(row.scope, row.scopes),
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    revoked_at: row.revoked_at,
  }));
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
