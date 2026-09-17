export type MediaEnv = {
  MEDIA_ENABLED?: string;
  MEDIA_CONTROL_PLANE_ENABLED?: string;
  MEDIA_DELIVERY_ENABLED?: string;
};

function flagValue(raw: string | undefined): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

/**
 * Ingest, `/app/media`, REST, MCP, project keys.
 * Explicit MEDIA_CONTROL_PLANE_ENABLED wins; otherwise MEDIA_ENABLED.
 */
export function mediaControlPlaneEnabled(env: MediaEnv): boolean {
  return flagValue(env.MEDIA_CONTROL_PLANE_ENABLED) ?? env.MEDIA_ENABLED === "true";
}

/**
 * Public GET /m/… delivery.
 * Can stay on while the control plane is rolled back so live aliases keep serving.
 */
export function mediaDeliveryEnabled(env: MediaEnv): boolean {
  return flagValue(env.MEDIA_DELIVERY_ENABLED) ?? env.MEDIA_ENABLED === "true";
}

/** Control-plane alias used by existing API/MCP/app gates. */
export function mediaEnabled(env: MediaEnv): boolean {
  return mediaControlPlaneEnabled(env);
}

/** Phase 1 catalog default. Prices stay out of schema. */
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
