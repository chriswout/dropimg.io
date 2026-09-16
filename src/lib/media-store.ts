import { inspectWebAsset } from "./inspect-web-asset";
import { track } from "./analytics";
import {
  MEDIA_IDEMPOTENCY_MAX_KEY_LENGTH,
  MEDIA_IDEMPOTENCY_TTL_SECONDS,
  PHASE1_PERM_MAX_UPLOAD_BYTES,
  PHASE1_PERM_STORAGE_BYTES,
  type MediaIdempotencyOperation,
} from "./media-config";
import { mediaAliasUrl, mediaVersionUrl, parseAliasPath, permanentOriginalKey } from "./media-path";
import { mapModerationFail } from "./upload-store";
import { runPostStripSafetyScan } from "./moderation-hook";
import { StripMetadataError, stripMetadata } from "./strip";
import {
  assetTypeFromStored,
  isRasterModeratedMime,
  type MediaMime,
  type WebAssetType,
} from "./web-assets";
import type { AllowedMime } from "../types";

export type MediaActorRef = {
  userId: string | null;
  credentialId: string | null;
};

export type MediaIngestFail = {
  ok: false;
  status: 400 | 404 | 409 | 413 | 415 | 422 | 500 | 503;
  code: string;
  error: string;
};

export type IdempotencyParse =
  | { present: false }
  | { present: true; ok: true; key: string }
  | { present: true; ok: false; code: "invalid_idempotency_key" | "idempotency_key_too_long"; error: string };

export type IdempotencyReplay =
  | { kind: "miss" }
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "conflict"; error: string };

export type StoredOriginal = {
  bytes: ArrayBuffer;
  mime: MediaMime;
  assetType: WebAssetType;
  width: number | null;
  height: number | null;
  sha256: string;
  byteSize: number;
};

export type MediaAssetPublic = {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  path: string;
  url: string;
  currentVersionId: string;
  versionId: string;
  versionUrl: string;
  mime: MediaMime;
  assetType: WebAssetType;
  size: number;
  width: number | null;
  height: number | null;
};

type OrgProjectSlugs = { orgSlug: string; projectSlug: string };

async function sha256HexOfBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function ingestOriginalBytes(
  env: Cloudflare.Env,
  bytes: ArrayBuffer,
): Promise<{ ok: true; stored: StoredOriginal } | MediaIngestFail> {
  if (bytes.byteLength === 0) {
    return { ok: false, status: 400, code: "invalid_image", error: "Empty upload" };
  }
  if (bytes.byteLength > PHASE1_PERM_MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, code: "too_large", error: "File exceeds the size limit" };
  }

  const inspected = inspectWebAsset(bytes);
  if (!inspected.ok) {
    if (inspected.reason === "too_many_pixels") {
      return {
        ok: false,
        status: 422,
        code: "invalid_image",
        error: inspected.error,
      };
    }
    if (inspected.reason === "too_large") {
      return { ok: false, status: 413, code: "too_large", error: inspected.error };
    }
    if (inspected.reason === "unsafe") {
      return { ok: false, status: 422, code: "unsafe_asset", error: inspected.error };
    }
    if (inspected.reason === "invalid" || inspected.reason === "too_short") {
      return { ok: false, status: 400, code: "invalid_image", error: inspected.error };
    }
    return {
      ok: false,
      status: 415,
      code: "unsupported_type",
      error: inspected.error,
    };
  }

  let storeBytes = inspected.bytes;
  if (isRasterModeratedMime(inspected.mime)) {
    try {
      storeBytes = stripMetadata(storeBytes, inspected.mime as AllowedMime);
    } catch (err) {
      const msg =
        err instanceof StripMetadataError ? err.message : "Could not strip image metadata";
      return { ok: false, status: 422, code: "invalid_image", error: msg };
    }
  }

  if (isRasterModeratedMime(inspected.mime)) {
    const scan = await runPostStripSafetyScan(env, {
      bytes: storeBytes,
      mime: inspected.mime,
    });
    if (!scan.ok) {
      const mapped = mapModerationFail(scan.reason);
      return { ok: false, status: mapped.status, code: mapped.code, error: mapped.error };
    }
  }

  return {
    ok: true,
    stored: {
      bytes: storeBytes,
      mime: inspected.mime,
      assetType: inspected.assetType,
      width: inspected.width,
      height: inspected.height,
      sha256: await sha256HexOfBytes(storeBytes),
      byteSize: storeBytes.byteLength,
    },
  };
}

export async function orgStorageBytes(db: D1Database, orgId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(delta), 0) AS bytes
       FROM usage_events
       WHERE org_id = ? AND meter = 'storage_original_bytes'`,
    )
    .bind(orgId)
    .first<{ bytes: number }>();
  return Number(row?.bytes ?? 0);
}

export function parseIdempotencyHeader(raw: string | undefined): IdempotencyParse {
  if (raw == null || raw === "") return { present: false };
  const key = raw.trim();
  if (!key) {
    return {
      present: true,
      ok: false,
      code: "invalid_idempotency_key",
      error: "Idempotency-Key must be 1–128 printable characters",
    };
  }
  if (key.length > MEDIA_IDEMPOTENCY_MAX_KEY_LENGTH) {
    return {
      present: true,
      ok: false,
      code: "idempotency_key_too_long",
      error: `Idempotency-Key must be at most ${MEDIA_IDEMPOTENCY_MAX_KEY_LENGTH} characters`,
    };
  }
  if (/[\u0000-\u001f\u007f]/.test(key)) {
    return {
      present: true,
      ok: false,
      code: "invalid_idempotency_key",
      error: "Idempotency-Key contains invalid characters",
    };
  }
  return { present: true, ok: true, key };
}

/** @deprecated Use parseIdempotencyHeader. Oversized/malformed keys are rejected, not ignored. */
export function parseIdempotencyKey(raw: string | undefined): string | null {
  const parsed = parseIdempotencyHeader(raw);
  return parsed.present && parsed.ok ? parsed.key : null;
}

export async function loadIdempotentResponse(
  db: D1Database,
  input: {
    orgId: string;
    projectId: string;
    operation: MediaIdempotencyOperation;
    key: string;
    now?: number;
  },
): Promise<IdempotencyReplay> {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT status, response_json, operation, expires_at
       FROM media_idempotency WHERE key = ? AND org_id = ? LIMIT 1`,
    )
    .bind(idempotencyPrimaryKey(input.orgId, input.projectId, input.key), input.orgId)
    .first<{
      status: number;
      response_json: string;
      operation: string | null;
      expires_at: number | null;
    }>();
  if (!row) return { kind: "miss" };
  if (row.expires_at == null || row.expires_at <= now) {
    await db
      .prepare(`DELETE FROM media_idempotency WHERE key = ? AND org_id = ?`)
      .bind(idempotencyPrimaryKey(input.orgId, input.projectId, input.key), input.orgId)
      .run();
    return { kind: "miss" };
  }
  if (row.operation && row.operation !== input.operation) {
    return {
      kind: "conflict",
      error: "Idempotency-Key was already used for a different operation",
    };
  }
  try {
    return { kind: "replay", status: row.status, body: JSON.parse(row.response_json) as unknown };
  } catch {
    return { kind: "miss" };
  }
}

export async function saveIdempotentResponse(
  db: D1Database,
  input: {
    orgId: string;
    projectId: string;
    operation: MediaIdempotencyOperation;
    key: string;
    status: number;
    body: unknown;
    now: number;
  },
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO media_idempotency
          (key, org_id, status, response_json, created_at, expires_at, operation, project_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        idempotencyPrimaryKey(input.orgId, input.projectId, input.key),
        input.orgId,
        input.status,
        JSON.stringify(input.body),
        input.now,
        input.now + MEDIA_IDEMPOTENCY_TTL_SECONDS,
        input.operation,
        input.projectId,
      )
      .run();
  } catch {
    // Unique race: the stored winner is returned by the next load.
  }
}

function idempotencyPrimaryKey(orgId: string, projectId: string, key: string): string {
  return `${orgId}:${projectId}:${key}`;
}

export async function createMediaAsset(
  env: Cloudflare.Env,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  input: {
    orgId: string;
    projectId: string;
    path: string;
    name?: string | null;
    bytes: ArrayBuffer;
    origin: string;
    slugs: OrgProjectSlugs;
    actor: MediaActorRef;
    requestId: string;
    now?: number;
  },
): Promise<{ ok: true; asset: MediaAssetPublic } | MediaIngestFail> {
  const path = parseAliasPath(input.path);
  if (!path) {
    return { ok: false, status: 400, code: "invalid_path", error: "Invalid alias path" };
  }
  const ingested = await ingestOriginalBytes(env, input.bytes);
  if (!ingested.ok) return ingested;

  const used = await orgStorageBytes(env.DB, input.orgId);
  if (used + ingested.stored.byteSize > PHASE1_PERM_STORAGE_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "quota_exceeded",
      error: "Permanent storage quota exceeded",
    };
  }

  const now = input.now ?? Math.floor(Date.now() / 1000);
  const assetId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const aliasId = crypto.randomUUID();
  const r2Key = permanentOriginalKey({
    orgId: input.orgId,
    projectId: input.projectId,
    assetId,
    versionId,
  });
  const name = (input.name?.trim() || path.split("/").pop() || path).slice(0, 80);

  try {
    await env.BUCKET.put(r2Key, ingested.stored.bytes, {
      httpMetadata: { contentType: ingested.stored.mime },
      customMetadata: { assetId, versionId },
    });
  } catch {
    return { ok: false, status: 500, code: "server_error", error: "Storage write failed" };
  }

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO assets (id, org_id, project_id, name, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(assetId, input.orgId, input.projectId, name, input.actor.userId, now),
      env.DB.prepare(
        `INSERT INTO asset_versions
          (id, org_id, asset_id, r2_key, sha256, mime, asset_type, byte_size, width, height, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)`,
      ).bind(
        versionId,
        input.orgId,
        assetId,
        r2Key,
        ingested.stored.sha256,
        ingested.stored.mime,
        ingested.stored.assetType,
        ingested.stored.byteSize,
        ingested.stored.width,
        ingested.stored.height,
        input.actor.userId,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO asset_aliases
          (id, org_id, project_id, asset_id, path, current_version_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(aliasId, input.orgId, input.projectId, assetId, path, versionId, now),
    ]);
  } catch (err) {
    ctx.waitUntil(env.BUCKET.delete(r2Key));
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { ok: false, status: 409, code: "conflict", error: "Alias path already exists" };
    }
    return { ok: false, status: 500, code: "server_error", error: "Database write failed" };
  }

  await recordUsageAndAudit(env.DB, {
    orgId: input.orgId,
    projectId: input.projectId,
    versionId,
    bytes: ingested.stored.byteSize,
    actor: input.actor,
    action: "asset.create",
    targetId: assetId,
    requestId: input.requestId,
    now,
  });

  const liveCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM assets WHERE project_id = ? AND org_id = ? AND deleted_at IS NULL`,
  )
    .bind(input.projectId, input.orgId)
    .first<{ n: number }>();
  const client = input.actor.credentialId ? "api" : "web";
  if (Number(liveCount?.n ?? 0) === 1) {
    track(env.ANALYTICS, "media_first_asset_created", { client });
  }
  track(env.ANALYTICS, "media_stable_url_returned", { client });

  return {
    ok: true,
    asset: toPublicAsset({
      origin: input.origin,
      slugs: input.slugs,
      assetId,
      projectId: input.projectId,
      orgId: input.orgId,
      name,
      path,
      versionId,
      mime: ingested.stored.mime,
      assetType: ingested.stored.assetType,
      size: ingested.stored.byteSize,
      width: ingested.stored.width,
      height: ingested.stored.height,
    }),
  };
}

export async function replaceMediaAsset(
  env: Cloudflare.Env,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  input: {
    orgId: string;
    projectId: string;
    assetId: string;
    bytes: ArrayBuffer;
    origin: string;
    slugs: OrgProjectSlugs;
    actor: MediaActorRef;
    requestId: string;
    now?: number;
  },
): Promise<{ ok: true; asset: MediaAssetPublic } | MediaIngestFail> {
  const existing = await loadLiveAsset(env.DB, input.assetId, input.orgId, input.projectId);
  if (!existing) {
    return { ok: false, status: 404, code: "not_found", error: "Not found" };
  }

  const ingested = await ingestOriginalBytes(env, input.bytes);
  if (!ingested.ok) return ingested;

  const used = await orgStorageBytes(env.DB, input.orgId);
  if (used + ingested.stored.byteSize > PHASE1_PERM_STORAGE_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "quota_exceeded",
      error: "Permanent storage quota exceeded",
    };
  }

  const now = input.now ?? Math.floor(Date.now() / 1000);
  const versionId = crypto.randomUUID();
  const r2Key = permanentOriginalKey({
    orgId: input.orgId,
    projectId: input.projectId,
    assetId: input.assetId,
    versionId,
  });

  try {
    await env.BUCKET.put(r2Key, ingested.stored.bytes, {
      httpMetadata: { contentType: ingested.stored.mime },
      customMetadata: { assetId: input.assetId, versionId },
    });
  } catch {
    return { ok: false, status: 500, code: "server_error", error: "Storage write failed" };
  }

  try {
    await env.DB.prepare(
      `INSERT INTO asset_versions
        (id, org_id, asset_id, r2_key, sha256, mime, asset_type, byte_size, width, height, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)`,
    )
      .bind(
        versionId,
        input.orgId,
        input.assetId,
        r2Key,
        ingested.stored.sha256,
        ingested.stored.mime,
        ingested.stored.assetType,
        ingested.stored.byteSize,
        ingested.stored.width,
        ingested.stored.height,
        input.actor.userId,
        now,
      )
      .run();
  } catch {
    ctx.waitUntil(env.BUCKET.delete(r2Key));
    return { ok: false, status: 500, code: "server_error", error: "Database write failed" };
  }

  const promoted = await env.DB.prepare(
    `UPDATE asset_aliases
     SET current_version_id = ?
     WHERE id = ? AND org_id = ? AND current_version_id = ? AND deleted_at IS NULL`,
  )
    .bind(versionId, existing.aliasId, input.orgId, existing.currentVersionId)
    .run();

  if ((promoted.meta.changes ?? 0) !== 1) {
    ctx.waitUntil(env.BUCKET.delete(r2Key));
    await env.DB.prepare(`DELETE FROM asset_versions WHERE id = ? AND org_id = ?`)
      .bind(versionId, input.orgId)
      .run();
    return { ok: false, status: 409, code: "conflict", error: "Asset was replaced concurrently" };
  }

  await recordUsageAndAudit(env.DB, {
    orgId: input.orgId,
    projectId: input.projectId,
    versionId,
    bytes: ingested.stored.byteSize,
    actor: input.actor,
    action: "asset.replace",
    targetId: input.assetId,
    requestId: input.requestId,
    now,
  });

  track(env.ANALYTICS, "media_asset_replaced", {
    client: input.actor.credentialId ? "api" : "web",
  });

  return {
    ok: true,
    asset: toPublicAsset({
      origin: input.origin,
      slugs: input.slugs,
      assetId: input.assetId,
      projectId: input.projectId,
      orgId: input.orgId,
      name: existing.name,
      path: existing.path,
      versionId,
      mime: ingested.stored.mime,
      assetType: ingested.stored.assetType,
      size: ingested.stored.byteSize,
      width: ingested.stored.width,
      height: ingested.stored.height,
    }),
  };
}

export type LiveAssetRow = {
  assetId: string;
  orgId: string;
  projectId: string;
  name: string;
  path: string;
  aliasId: string;
  currentVersionId: string;
  mime: string;
  assetType: string | null;
  byteSize: number;
  width: number | null;
  height: number | null;
};

export async function loadLiveAsset(
  db: D1Database,
  assetId: string,
  orgId: string,
  projectId?: string,
): Promise<LiveAssetRow | null> {
  const projectClause = projectId ? "AND a.project_id = ?" : "";
  const binds = projectId ? [assetId, orgId, projectId] : [assetId, orgId];
  return db
    .prepare(
      `SELECT a.id AS assetId, a.org_id AS orgId, a.project_id AS projectId, a.name,
              al.path, al.id AS aliasId, al.current_version_id AS currentVersionId,
              v.mime, v.asset_type AS assetType, v.byte_size AS byteSize, v.width, v.height
       FROM assets a
       JOIN asset_aliases al
         ON al.asset_id = a.id AND al.org_id = a.org_id AND al.deleted_at IS NULL
       JOIN asset_versions v
         ON v.id = al.current_version_id AND v.org_id = a.org_id
       WHERE a.id = ? AND a.org_id = ? AND a.deleted_at IS NULL ${projectClause}
       LIMIT 1`,
    )
    .bind(...binds)
    .first<LiveAssetRow>();
}

export type AssetVersionRow = {
  id: string;
  mime: string;
  asset_type: string | null;
  byte_size: number;
  width: number | null;
  height: number | null;
  created_at: number;
  status: string;
  r2_key: string;
};

export async function listAssetVersions(
  db: D1Database,
  assetId: string,
  orgId: string,
): Promise<AssetVersionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, mime, asset_type, byte_size, width, height, created_at, status, r2_key
       FROM asset_versions
       WHERE asset_id = ? AND org_id = ?
       ORDER BY created_at ASC`,
    )
    .bind(assetId, orgId)
    .all<AssetVersionRow>();
  return results ?? [];
}

export async function deleteMediaAsset(
  env: Cloudflare.Env,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  input: {
    orgId: string;
    projectId: string;
    assetId: string;
    actor: MediaActorRef;
    requestId: string;
    now?: number;
  },
): Promise<{ ok: true } | MediaIngestFail> {
  const existing = await loadLiveAsset(env.DB, input.assetId, input.orgId, input.projectId);
  if (!existing) {
    return { ok: false, status: 404, code: "not_found", error: "Not found" };
  }

  const versions = await listAssetVersions(env.DB, input.assetId, input.orgId);
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const marked = await env.DB.prepare(
    `UPDATE assets SET deleted_at = ? WHERE id = ? AND org_id = ? AND deleted_at IS NULL`,
  )
    .bind(now, input.assetId, input.orgId)
    .run();
  if ((marked.meta.changes ?? 0) !== 1) {
    return { ok: false, status: 404, code: "not_found", error: "Not found" };
  }

  const statements = [
    env.DB.prepare(
      `UPDATE asset_aliases SET deleted_at = ? WHERE asset_id = ? AND org_id = ? AND deleted_at IS NULL`,
    ).bind(now, input.assetId, input.orgId),
    env.DB.prepare(
      `UPDATE asset_versions SET status = 'deleted' WHERE asset_id = ? AND org_id = ? AND status = 'ready'`,
    ).bind(input.assetId, input.orgId),
    env.DB.prepare(
      `INSERT INTO audit_events
        (id, org_id, actor_user_id, actor_credential_id, action, target_type, target_id, request_id, created_at)
       VALUES (?, ?, ?, ?, 'asset.delete', 'asset', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      input.orgId,
      input.actor.userId,
      input.actor.credentialId,
      input.assetId,
      input.requestId,
      now,
    ),
  ];
  for (const version of versions) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO usage_events
          (id, org_id, project_id, meter, delta, idempotency_key, occurred_at, source, ref_type, ref_id)
         VALUES (?, ?, ?, 'storage_original_bytes', ?, ?, ?, 'api', 'asset_version', ?)`,
      ).bind(
        crypto.randomUUID(),
        input.orgId,
        input.projectId,
        -version.byte_size,
        `${input.orgId}:storage:delete:${version.id}`,
        now,
        version.id,
      ),
    );
  }
  await env.DB.batch(statements);

  ctx.waitUntil(
    Promise.all(versions.map((version) => env.BUCKET.delete(version.r2_key))),
  );
  return { ok: true };
}

export async function listProjectAssets(
  db: D1Database,
  orgId: string,
  projectId: string,
): Promise<LiveAssetRow[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id AS assetId, a.org_id AS orgId, a.project_id AS projectId, a.name,
              al.path, al.id AS aliasId, al.current_version_id AS currentVersionId,
              v.mime, v.asset_type AS assetType, v.byte_size AS byteSize, v.width, v.height
       FROM assets a
       JOIN asset_aliases al
         ON al.asset_id = a.id AND al.org_id = a.org_id AND al.deleted_at IS NULL
       JOIN asset_versions v
         ON v.id = al.current_version_id AND v.org_id = a.org_id
       WHERE a.project_id = ? AND a.org_id = ? AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC
       LIMIT 100`,
    )
    .bind(projectId, orgId)
    .all<LiveAssetRow>();
  return results ?? [];
}

export function publicAssetFromRow(
  origin: string,
  slugs: OrgProjectSlugs,
  row: LiveAssetRow,
): MediaAssetPublic {
  return toPublicAsset({
    origin,
    slugs,
    assetId: row.assetId,
    projectId: row.projectId,
    orgId: row.orgId,
    name: row.name,
    path: row.path,
    versionId: row.currentVersionId,
    mime: row.mime as MediaMime,
    assetType: assetTypeFromStored(row.mime, row.assetType),
    size: row.byteSize,
    width: row.width,
    height: row.height,
  });
}

function toPublicAsset(input: {
  origin: string;
  slugs: OrgProjectSlugs;
  assetId: string;
  projectId: string;
  orgId: string;
  name: string;
  path: string;
  versionId: string;
  mime: MediaMime;
  assetType: WebAssetType;
  size: number;
  width: number | null;
  height: number | null;
}): MediaAssetPublic {
  const url = mediaAliasUrl(input.origin, input.slugs.orgSlug, input.slugs.projectSlug, input.path);
  return {
    id: input.assetId,
    orgId: input.orgId,
    projectId: input.projectId,
    name: input.name,
    path: input.path,
    url,
    currentVersionId: input.versionId,
    versionId: input.versionId,
    versionUrl: mediaVersionUrl(
      input.origin,
      input.slugs.orgSlug,
      input.slugs.projectSlug,
      input.path,
      input.versionId,
    ),
    mime: input.mime,
    assetType: input.assetType,
    size: input.size,
    width: input.width,
    height: input.height,
  };
}

async function recordUsageAndAudit(
  db: D1Database,
  input: {
    orgId: string;
    projectId: string;
    versionId: string;
    bytes: number;
    actor: MediaActorRef;
    action: string;
    targetId: string;
    requestId: string;
    now: number;
  },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO usage_events
          (id, org_id, project_id, meter, delta, idempotency_key, occurred_at, source, ref_type, ref_id)
         VALUES (?, ?, ?, 'storage_original_bytes', ?, ?, ?, 'api', 'asset_version', ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orgId,
        input.projectId,
        input.bytes,
        `${input.orgId}:storage:${input.versionId}`,
        input.now,
        input.versionId,
      ),
    db
      .prepare(
        `INSERT INTO usage_events
          (id, org_id, project_id, meter, delta, idempotency_key, occurred_at, source, ref_type, ref_id)
         VALUES (?, ?, ?, 'uploads', 1, ?, ?, 'api', 'asset_version', ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orgId,
        input.projectId,
        `${input.orgId}:uploads:${input.versionId}`,
        input.now,
        input.versionId,
      ),
    db
      .prepare(
        `INSERT INTO audit_events
          (id, org_id, actor_user_id, actor_credential_id, action, target_type, target_id, request_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'asset', ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orgId,
        input.actor.userId,
        input.actor.credentialId,
        input.action,
        input.targetId,
        input.requestId,
        input.now,
      ),
  ]);
}
