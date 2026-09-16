/** Permanent Media web-asset taxonomy. Not used by temporary Drops. */

export const WEB_ASSET_TYPES = ["image", "vector", "icon", "font"] as const;
export type WebAssetType = (typeof WEB_ASSET_TYPES)[number];

export const MEDIA_MIMES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/x-icon",
  "font/woff",
  "font/woff2",
] as const;
export type MediaMime = (typeof MEDIA_MIMES)[number];

/** Canonical ICO MIME. `image/vnd.microsoft.icon` exists but browsers treat `image/x-icon` as the favicon type. */
export const ICO_MIME = "image/x-icon" as const;

export const MEDIA_FONT_MAX_BYTES = 2 * 1024 * 1024;
export const MEDIA_SVG_MAX_BYTES = 1 * 1024 * 1024;
export const MEDIA_ICO_MAX_BYTES = 1 * 1024 * 1024;

export const UNSUPPORTED_WEB_ASSET_MESSAGE =
  "Unsupported web asset. DropIMG Media accepts JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, and WOFF2.";

export function isMediaMime(value: string): value is MediaMime {
  return (MEDIA_MIMES as readonly string[]).includes(value);
}

export function isWebAssetType(value: string): value is WebAssetType {
  return (WEB_ASSET_TYPES as readonly string[]).includes(value);
}

export function assetTypeForMime(mime: MediaMime): WebAssetType {
  switch (mime) {
    case "image/svg+xml":
      return "vector";
    case "image/x-icon":
      return "icon";
    case "font/woff":
    case "font/woff2":
      return "font";
    default:
      return "image";
  }
}

/** Infer type for rows written before asset_type existed. */
export function assetTypeFromStored(mime: string, stored?: string | null): WebAssetType {
  if (stored && isWebAssetType(stored)) return stored;
  if (isMediaMime(mime)) return assetTypeForMime(mime);
  return "image";
}

export function isRasterModeratedMime(mime: MediaMime): boolean {
  return (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/webp" ||
    mime === "image/gif"
  );
}

export function mediaMimeToExt(mime: MediaMime): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    case "image/svg+xml":
      return "svg";
    case "image/x-icon":
      return "ico";
    case "font/woff":
      return "woff";
    case "font/woff2":
      return "woff2";
  }
}
