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
