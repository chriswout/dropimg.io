import { randomToken, sha256Bytes } from "./auth/crypto";
import {
  MEDIA_UPLOAD_INTENT_PREFIX,
  MEDIA_UPLOAD_INTENT_TTL_SECONDS,
  PHASE1_PERM_MAX_UPLOAD_BYTES,
  type MediaUploadOperation,
} from "./media-config";
import { isUuid, parseAliasPath } from "./media-path";
import { loadLiveAsset } from "./media-store";

export type MediaUploadIntentPublic = {
  id: string;
  uploadUrl: string;
  method: "POST";
  headers: Record<string, string>;
  expiresAt: number;
  maxBytes: number;
  operation: MediaUploadOperation;
  projectId: string;
  path: string | null;
  assetId: string | null;
};

export type MediaUploadIntentRow = {
  id: string;
  orgId: string;
  projectId: string;
  operation: MediaUploadOperation;
  path: string | null;
  assetId: string | null;
  name: string | null;
  actorUserId: string | null;
  actorCredentialId: string | null;
};

export function mediaIntentTokenFormatOk(token: string): boolean {
  if (!token.startsWith(MEDIA_UPLOAD_INTENT_PREFIX)) return false;
  const rest = token.slice(MEDIA_UPLOAD_INTENT_PREFIX.length);
  return rest.length >= 22 && rest.length <= 128 && /^[A-Za-z0-9_-]+$/.test(rest);
}

export async function createMediaUploadIntent(
  db: D1Database,
  input: {
    orgId: string;
    projectId: string;
    operation: MediaUploadOperation;
    path?: string | null;
    assetId?: string | null;
    name?: string | null;
    actorUserId: string | null;
    actorCredentialId: string | null;
    origin: string;
    now?: number;
  },
): Promise<{ ok: true; intent: MediaUploadIntentPublic; token: string } | { ok: false; status: 400 | 404; code: string; error: string }> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  let path: string | null = null;
  let assetId: string | null = null;
  if (input.operation === "create") {
    const parsed = parseAliasPath(input.path || "");
    if (!parsed) {
      return { ok: false, status: 400, code: "invalid_path", error: "Invalid alias path" };
    }
    path = parsed;
  } else {
    if (!input.assetId || !isUuid(input.assetId)) {
      return { ok: false, status: 400, code: "invalid_asset", error: "asset_id is required" };
    }
    const live = await loadLiveAsset(db, input.assetId, input.orgId, input.projectId);
    if (!live) {
      return { ok: false, status: 404, code: "not_found", error: "Not found" };
    }
    assetId = live.assetId;
    path = live.path;
  }

  const id = crypto.randomUUID();
  const token = `${MEDIA_UPLOAD_INTENT_PREFIX}${randomToken()}`;
  const hash = await sha256Bytes(token);
  const expiresAt = now + MEDIA_UPLOAD_INTENT_TTL_SECONDS;
  const name = input.name?.trim().slice(0, 80) || null;
  await db
    .prepare(
      `INSERT INTO media_upload_intents
        (id, token_hash, org_id, project_id, operation, path, asset_id, name,
         actor_user_id, actor_credential_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      new Uint8Array(hash),
      input.orgId,
      input.projectId,
      input.operation,
      path,
      assetId,
      name,
      input.actorUserId,
      input.actorCredentialId,
      now,
      expiresAt,
    )
    .run();

  return {
    ok: true,
    token,
    intent: {
      id,
      uploadUrl: `${input.origin.replace(/\/$/, "")}/api/v1/media/intents/${id}`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      expiresAt,
      maxBytes: PHASE1_PERM_MAX_UPLOAD_BYTES,
      operation: input.operation,
      projectId: input.projectId,
      path,
      assetId,
    },
  };
}

export async function consumeMediaUploadIntent(
  db: D1Database,
  input: {
    intentId: string;
    token: string;
    now?: number;
    claimedPath?: string | null;
    claimedAssetId?: string | null;
    claimedOperation?: string | null;
    claimedProjectId?: string | null;
  },
): Promise<
  | { ok: true; intent: MediaUploadIntentRow }
  | { ok: false; status: 400 | 401 | 404 | 409; code: string; error: string }
> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (!isUuid(input.intentId) || !mediaIntentTokenFormatOk(input.token)) {
    return { ok: false, status: 401, code: "unauthorized", error: "Unauthorized" };
  }
  const hash = await sha256Bytes(input.token);
  const row = await db
    .prepare(
      `SELECT id, org_id, project_id, operation, path, asset_id, name,
              actor_user_id, actor_credential_id, expires_at, consumed_at
       FROM media_upload_intents WHERE id = ? AND token_hash = ? LIMIT 1`,
    )
    .bind(input.intentId, new Uint8Array(hash))
    .first<{
      id: string;
      org_id: string;
      project_id: string;
      operation: string;
      path: string | null;
      asset_id: string | null;
      name: string | null;
      actor_user_id: string | null;
      actor_credential_id: string | null;
      expires_at: number;
      consumed_at: number | null;
    }>();
  if (!row) {
    return { ok: false, status: 401, code: "unauthorized", error: "Unauthorized" };
  }
  if (row.consumed_at) {
    return { ok: false, status: 409, code: "intent_reused", error: "Upload intent already used" };
  }
  if (row.expires_at <= now) {
    return { ok: false, status: 401, code: "intent_expired", error: "Upload intent expired" };
  }
  if (row.operation !== "create" && row.operation !== "replace") {
    return { ok: false, status: 401, code: "unauthorized", error: "Unauthorized" };
  }
  if (input.claimedOperation && input.claimedOperation !== row.operation) {
    return { ok: false, status: 400, code: "operation_mismatch", error: "Operation does not match this intent" };
  }
  if (input.claimedProjectId && input.claimedProjectId !== row.project_id) {
    return { ok: false, status: 400, code: "project_mismatch", error: "Project does not match this intent" };
  }
  if (input.claimedPath && input.claimedPath !== row.path) {
    return { ok: false, status: 400, code: "path_mismatch", error: "Path does not match this intent" };
  }
  if (input.claimedAssetId && input.claimedAssetId !== row.asset_id) {
    return { ok: false, status: 400, code: "asset_mismatch", error: "Asset does not match this intent" };
  }

  const consumed = await db
    .prepare(
      `UPDATE media_upload_intents
       SET consumed_at = ?
       WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`,
    )
    .bind(now, row.id, now)
    .run();
  if ((consumed.meta.changes ?? 0) !== 1) {
    return { ok: false, status: 409, code: "intent_reused", error: "Upload intent already used" };
  }

  return {
    ok: true,
    intent: {
      id: row.id,
      orgId: row.org_id,
      projectId: row.project_id,
      operation: row.operation,
      path: row.path,
      assetId: row.asset_id,
      name: row.name,
      actorUserId: row.actor_user_id,
      actorCredentialId: row.actor_credential_id,
    },
  };
}

export function readIntentBearer(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  return match?.[1] ?? null;
}
