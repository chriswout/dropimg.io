import { MAX_MEGAPIXELS, type AllowedMime } from "../types";

export type InspectOk = {
  ok: true;
  mime: AllowedMime;
  width: number | null;
  height: number | null;
};

export type InspectFail = {
  ok: false;
  reason: "unsupported" | "svg" | "too_short" | "too_many_pixels" | "invalid";
};

export type InspectResult = InspectOk | InspectFail;

/**
 * Magic-byte MIME allowlist, SVG rejection, dimension parse, 50MP bomb check.
 */
export function inspectImage(bytes: ArrayBuffer): InspectResult {
  const u8 = new Uint8Array(bytes);
  if (u8.byteLength < 12) return { ok: false, reason: "too_short" };
  if (looksLikeSvg(u8)) return { ok: false, reason: "svg" };

  let mime: AllowedMime | null = null;
  let width: number | null = null;
  let height: number | null = null;

  if (isPng(u8)) {
    mime = "image/png";
    const dim = pngSize(u8);
    if (!dim) return { ok: false, reason: "invalid" };
    width = dim.w;
    height = dim.h;
  } else if (isJpeg(u8)) {
    mime = "image/jpeg";
    const dim = jpegSize(u8);
    if (!dim) return { ok: false, reason: "invalid" };
    width = dim.w;
    height = dim.h;
  } else if (isGif(u8)) {
    mime = "image/gif";
    const dim = gifSize(u8);
    if (!dim) return { ok: false, reason: "invalid" };
    width = dim.w;
    height = dim.h;
  } else if (isWebp(u8)) {
    mime = "image/webp";
    const dim = webpSize(u8);
    if (!dim) return { ok: false, reason: "invalid" };
    width = dim.w;
    height = dim.h;
  } else {
    return { ok: false, reason: "unsupported" };
  }

  if (
    width != null &&
    height != null &&
    width > 0 &&
    height > 0 &&
    width * height > MAX_MEGAPIXELS
  ) {
    return { ok: false, reason: "too_many_pixels" };
  }

  return { ok: true, mime, width, height };
}

/** @deprecated use inspectImage */
export const inspectMime = inspectImage;

function looksLikeSvg(u8: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(u8.slice(0, Math.min(256, u8.byteLength)))
    .trimStart()
    .toLowerCase();
  if (head.startsWith("<svg") || head.includes("<svg")) return true;
  if (head.startsWith("<?xml") && head.includes("<svg")) return true;
  return false;
}

function isPng(u8: Uint8Array): boolean {
  return (
    u8[0] === 0x89 &&
    u8[1] === 0x50 &&
    u8[2] === 0x4e &&
    u8[3] === 0x47 &&
    u8[4] === 0x0d &&
    u8[5] === 0x0a &&
    u8[6] === 0x1a &&
    u8[7] === 0x0a
  );
}

function isJpeg(u8: Uint8Array): boolean {
  return u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
}

function isGif(u8: Uint8Array): boolean {
  return (
    u8[0] === 0x47 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x38 &&
    (u8[4] === 0x37 || u8[4] === 0x39) &&
    u8[5] === 0x61
  );
}

function isWebp(u8: Uint8Array): boolean {
  return (
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  );
}

function pngSize(u8: Uint8Array): { w: number; h: number } | null {
  // IHDR is first chunk: 8 sig + 4 len + 4 type + 4w + 4h
  if (u8.length < 24) return null;
  const type = String.fromCharCode(u8[12]!, u8[13]!, u8[14]!, u8[15]!);
  if (type !== "IHDR") return null;
  const w = readU32be(u8, 16);
  const h = readU32be(u8, 20);
  if (w === 0 || h === 0) return null;
  return { w, h };
}

function gifSize(u8: Uint8Array): { w: number; h: number } | null {
  if (u8.length < 10) return null;
  const w = u8[6]! | (u8[7]! << 8);
  const h = u8[8]! | (u8[9]! << 8);
  if (w === 0 || h === 0) return null;
  return { w, h };
}

function jpegSize(u8: Uint8Array): { w: number; h: number } | null {
  let i = 2;
  while (i + 9 < u8.length) {
    if (u8[i] !== 0xff) return null;
    while (i < u8.length && u8[i] === 0xff) i++;
    if (i >= u8.length) return null;
    const marker = u8[i]!;
    i++;
    // Soft markers / RST without length
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (i + 1 >= u8.length) return null;
    const len = (u8[i]! << 8) | u8[i + 1]!;
    if (len < 2) return null;
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15 (exclude DHT etc.)
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && len >= 7 && i + 7 < u8.length) {
      const h = (u8[i + 3]! << 8) | u8[i + 4]!;
      const w = (u8[i + 5]! << 8) | u8[i + 6]!;
      if (w === 0 || h === 0) return null;
      return { w, h };
    }
    i += len;
  }
  return null;
}

function webpSize(u8: Uint8Array): { w: number; h: number } | null {
  // VP8X: 10 bytes payload starting at chunk data; canvas size is 24-bit LE minus 1
  // VP8L: signature 0x2f then 14-bit w-1 / h-1
  // VP8 : skip frame tag, look for sync 0x9d 0x01 0x2a then 16-bit w/h
  let i = 12;
  while (i + 8 <= u8.length) {
    const fourcc = String.fromCharCode(u8[i]!, u8[i + 1]!, u8[i + 2]!, u8[i + 3]!);
    const size =
      (u8[i + 4]! |
        (u8[i + 5]! << 8) |
        (u8[i + 6]! << 16) |
        (u8[i + 7]! << 24)) >>>
      0;
    const dataStart = i + 8;
    const padded = size + (size % 2);
    if (dataStart + size > u8.length) return null;

    if (fourcc === "VP8X" && size >= 10) {
      const w =
        1 +
        (u8[dataStart + 4]! |
          (u8[dataStart + 5]! << 8) |
          (u8[dataStart + 6]! << 16));
      const h =
        1 +
        (u8[dataStart + 7]! |
          (u8[dataStart + 8]! << 8) |
          (u8[dataStart + 9]! << 16));
      return { w, h };
    }
    if (fourcc === "VP8L" && size >= 5 && u8[dataStart] === 0x2f) {
      const b1 = u8[dataStart + 1]!;
      const b2 = u8[dataStart + 2]!;
      const b3 = u8[dataStart + 3]!;
      const b4 = u8[dataStart + 4]!;
      const w = 1 + (((b2 & 0x3f) << 8) | b1);
      const h = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { w, h };
    }
    if (fourcc === "VP8 " && size >= 10) {
      // Lossy bitstream: 3-byte frame tag, then optional 3-byte sync + dimensions
      let p = dataStart + 3;
      if (p + 7 <= dataStart + size) {
        if (u8[p] === 0x9d && u8[p + 1] === 0x01 && u8[p + 2] === 0x2a) {
          const w = u8[p + 3]! | ((u8[p + 4]! & 0x3f) << 8);
          const h = u8[p + 5]! | ((u8[p + 6]! & 0x3f) << 8);
          if (w > 0 && h > 0) return { w, h };
        }
      }
    }
    i = dataStart + padded;
  }
  return null;
}

function readU32be(u8: Uint8Array, i: number): number {
  return (
    ((u8[i]! << 24) | (u8[i + 1]! << 16) | (u8[i + 2]! << 8) | u8[i + 3]!) >>> 0
  );
}

export function mimeToExt(mime: AllowedMime): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
  }
}
