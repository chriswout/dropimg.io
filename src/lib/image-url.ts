import { mimeToExt } from "./inspect";
import { isValidSlug } from "./slug";
import type { AllowedMime } from "../types";

const DIRECT_IMAGE_RE = /^([1-9A-HJ-NP-Za-km-z]{8})\.([A-Za-z]+)$/;

export function directImagePath(slug: string, mime: AllowedMime): string {
  return `/${slug}.${mimeToExt(mime)}`;
}

export function directImageUrl(
  origin: string,
  slug: string,
  mime: AllowedMime,
): string {
  return `${origin.replace(/\/$/, "")}${directImagePath(slug, mime)}`;
}

export function parseDirectImageFilename(
  filename: string,
): { slug: string; ext: string } | null {
  const match = DIRECT_IMAGE_RE.exec(filename);
  if (!match || !isValidSlug(match[1]!)) return null;
  const ext = match[2]!.toLowerCase();
  if (ext !== "png" && ext !== "jpg" && ext !== "jpeg" && ext !== "webp" && ext !== "gif") {
    return null;
  }
  return { slug: match[1]!, ext };
}

export function extensionMatchesMime(ext: string, mime: AllowedMime): boolean {
  if (mime === "image/jpeg") return ext === "jpg" || ext === "jpeg";
  return ext === mimeToExt(mime);
}
