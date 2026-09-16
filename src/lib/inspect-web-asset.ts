import { inspectImage, looksLikeSvg } from "./inspect";
import { inspectAvif } from "./inspect-avif";
import { inspectIco } from "./inspect-ico";
import { inspectWoff, inspectWoff2 } from "./inspect-woff";
import { sanitizeSvg } from "./sanitize-svg";
import {
  ICO_MIME,
  MEDIA_FONT_MAX_BYTES,
  MEDIA_ICO_MAX_BYTES,
  MEDIA_SVG_MAX_BYTES,
  UNSUPPORTED_WEB_ASSET_MESSAGE,
  assetTypeForMime,
  type MediaMime,
  type WebAssetType,
} from "./web-assets";

export type WebAssetInspectOk = {
  ok: true;
  mime: MediaMime;
  assetType: WebAssetType;
  width: number | null;
  height: number | null;
  bytes: ArrayBuffer;
  sanitized: boolean;
};

export type WebAssetInspectFail = {
  ok: false;
  reason: "unsupported" | "invalid" | "too_short" | "too_many_pixels" | "too_large" | "unsafe";
  error: string;
};

export type WebAssetInspectResult = WebAssetInspectOk | WebAssetInspectFail;

export function inspectWebAsset(bytes: ArrayBuffer): WebAssetInspectResult {
  const u8 = new Uint8Array(bytes);
  if (u8.byteLength < 4) {
    return fail("too_short", "File is too small to be a web asset");
  }

  if (looksLikeSvg(u8)) {
    if (u8.byteLength > MEDIA_SVG_MAX_BYTES) {
      return fail("too_large", "SVG exceeds the 1 MB limit");
    }
    const sanitized = sanitizeSvg(bytes);
    if (!sanitized.ok) {
      return fail(
        sanitized.reason === "unsafe" ? "unsafe" : "invalid",
        sanitized.reason === "unsafe"
          ? "SVG contains active or external content"
          : "Invalid SVG",
      );
    }
    const encoded = new TextEncoder().encode(sanitized.svg);
    return {
      ok: true,
      mime: "image/svg+xml",
      assetType: "vector",
      width: sanitized.width,
      height: sanitized.height,
      bytes: encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength),
      sanitized: true,
    };
  }

  const raster = inspectImage(bytes);
  if (raster.ok) {
    return {
      ok: true,
      mime: raster.mime,
      assetType: assetTypeForMime(raster.mime),
      width: raster.width,
      height: raster.height,
      bytes,
      sanitized: false,
    };
  }
  if (raster.reason === "too_many_pixels") {
    return fail("too_many_pixels", "Image dimensions exceed the 50 megapixel limit");
  }
  if (raster.reason === "invalid") {
    return fail("invalid", "Invalid or truncated image file");
  }

  if (looksLikeFtyp(u8)) {
    const avif = inspectAvif(u8);
    if (avif.ok) {
      return {
        ok: true,
        mime: "image/avif",
        assetType: "image",
        width: avif.width,
        height: avif.height,
        bytes,
        sanitized: false,
      };
    }
    if (avif.reason === "too_many_pixels") {
      return fail("too_many_pixels", "Image dimensions exceed the 50 megapixel limit");
    }
    if (ftypIsAvif(u8)) {
      return fail("invalid", "Invalid or truncated AVIF file");
    }
    return fail("unsupported", UNSUPPORTED_WEB_ASSET_MESSAGE);
  }

  if (looksLikeIco(u8)) {
    if (u8.byteLength > MEDIA_ICO_MAX_BYTES) {
      return fail("too_large", "ICO exceeds the 1 MB limit");
    }
    const ico = inspectIco(u8);
    if (!ico.ok) {
      return fail(
        ico.reason === "too_many_pixels" ? "too_many_pixels" : "invalid",
        ico.reason === "too_many_pixels"
          ? "Image dimensions exceed the 50 megapixel limit"
          : "Invalid or truncated ICO file",
      );
    }
    return {
      ok: true,
      mime: ICO_MIME,
      assetType: "icon",
      width: ico.width,
      height: ico.height,
      bytes,
      sanitized: false,
    };
  }

  if (looksLikeWoff(u8) || looksLikeWoff2(u8)) {
    if (u8.byteLength > MEDIA_FONT_MAX_BYTES) {
      return fail("too_large", "Font exceeds the 2 MB limit");
    }
    const font = looksLikeWoff2(u8) ? inspectWoff2(u8) : inspectWoff(u8);
    if (!font.ok) return fail("invalid", "Invalid or truncated font file");
    const mime: MediaMime = looksLikeWoff2(u8) ? "font/woff2" : "font/woff";
    return {
      ok: true,
      mime,
      assetType: "font",
      width: null,
      height: null,
      bytes,
      sanitized: false,
    };
  }

  return fail("unsupported", UNSUPPORTED_WEB_ASSET_MESSAGE);
}

function fail(reason: WebAssetInspectFail["reason"], error: string): WebAssetInspectFail {
  return { ok: false, reason, error };
}

function looksLikeFtyp(u8: Uint8Array): boolean {
  return u8.byteLength >= 12 && u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70;
}

function ftypIsAvif(u8: Uint8Array): boolean {
  const slice = new TextDecoder("latin1").decode(u8.subarray(8, Math.min(64, u8.byteLength)));
  return slice.includes("avif") || slice.includes("avis");
}

function looksLikeIco(u8: Uint8Array): boolean {
  return u8[0] === 0 && u8[1] === 0 && u8[2] === 1 && u8[3] === 0;
}

function looksLikeWoff(u8: Uint8Array): boolean {
  return u8[0] === 0x77 && u8[1] === 0x4f && u8[2] === 0x46 && u8[3] === 0x46;
}

function looksLikeWoff2(u8: Uint8Array): boolean {
  return u8[0] === 0x77 && u8[1] === 0x4f && u8[2] === 0x46 && u8[3] === 0x32;
}
