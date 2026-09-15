export type MediaEnv = { MEDIA_ENABLED?: string };

export function mediaEnabled(env: MediaEnv): boolean {
  return env.MEDIA_ENABLED === "true";
}

/** Phase 1 catalog default. Prices stay out of schema. */
export const PHASE1_PERM_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;
export const PHASE1_PERM_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MEDIA_SCOPES = ["media:read", "media:write"] as const;
export type MediaScope = (typeof MEDIA_SCOPES)[number];

export const PROJECT_KEY_PREFIX = "dropimg_pk_";
export const MEDIA_UPLOAD_INTENT_PREFIX = "dropimg_ui_";

/** Idempotency-Key is required to be 1–128 printable characters when present. */
export const MEDIA_IDEMPOTENCY_MAX_KEY_LENGTH = 128;
export const MEDIA_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** One-use HTTP upload tickets for MCP/agents. Bytes never travel in JSON-RPC. */
export const MEDIA_UPLOAD_INTENT_TTL_SECONDS = 10 * 60;

export type MediaIdempotencyOperation = "asset.create" | "asset.replace";
export type MediaUploadOperation = "create" | "replace";
