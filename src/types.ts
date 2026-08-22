/** Shared types used by Worker and client. */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_MEGAPIXELS = 50_000_000;
export const TTL_SECONDS = 24 * 60 * 60;
export const SLUG_LENGTH = 8;
export const IMAGE_CACHE_SECONDS = 300;

export const ALLOWED_MIMES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type AllowedMime = (typeof ALLOWED_MIMES)[number];

export type UploadResponse = {
  slug: string;
  url: string;
  imageUrl: string;
  deleteUrl: string;
  deleteToken: string;
  expiresAt: number;
  width: number | null;
  height: number | null;
  size: number;
  mime: AllowedMime;
};

export type UploadErrorResponse = {
  error: string;
  code:
    | "too_large"
    | "unsupported_type"
    | "invalid_image"
    | "rate_limited"
    | "quota_exceeded"
    | "server_error";
};

export type RecentDrop = {
  slug: string;
  url: string;
  deleteToken: string;
  expiresAt: number;
  mime: string;
  size: number;
};

export type ImageRow = {
  id: string;
  slug: string;
  r2_key: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  delete_token_hash: unknown;
  ip_hash: string | null;
  created_at: number;
  expires_at: number;
  deleted_at: number | null;
  delete_reason: string | null;
};
