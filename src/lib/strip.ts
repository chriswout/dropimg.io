/**
 * Strip EXIF/XMP/text metadata.
 * Fail closed: parse/strip errors throw so uploads are rejected rather than
 * storing original bytes after advertising metadata removal.
 *
 * Two-pass: measure retained size, then copy into one exact output buffer.
 */

import type { AllowedMime } from "../types";

export class StripMetadataError extends Error {
  constructor(message = "Could not strip image metadata") {
    super(message);
    this.name = "StripMetadataError";
  }
}

type Span = { start: number; end: number };

export function stripMetadata(
  bytes: ArrayBuffer,
  mime: AllowedMime,
): ArrayBuffer {
  try {
    switch (mime) {
      case "image/jpeg":
        return stripJpeg(bytes);
      case "image/png":
        return stripPng(bytes);
      case "image/webp":
        return stripWebp(bytes);
      case "image/gif":
        return stripGif(bytes);
    }
  } catch (err) {
    if (err instanceof StripMetadataError) throw err;
    throw new StripMetadataError();
  }
}

function stripJpeg(bytes: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  if (u8.length < 4 || u8[0] !== 0xff || u8[1] !== 0xd8) {
    throw new StripMetadataError("Invalid JPEG while stripping metadata");
  }

  const spans: Span[] = [{ start: 0, end: 2 }];
  let i = 2;
  let sawSos = false;
  while (i < u8.length) {
    if (u8[i] !== 0xff) {
      spans.push({ start: i, end: u8.length });
      sawSos = true;
      break;
    }
    while (i < u8.length && u8[i] === 0xff) i++;
    if (i >= u8.length) break;
    const marker = u8[i]!;
    const markerStart = i - 1;
    i++;

    if (marker === 0xd9 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      spans.push({ start: markerStart, end: markerStart + 2 });
      continue;
    }

    if (i + 1 >= u8.length) {
      throw new StripMetadataError("Truncated JPEG marker while stripping");
    }
    const len = (u8[i]! << 8) | u8[i + 1]!;
    if (len < 2 || i + len > u8.length) {
      throw new StripMetadataError("Malformed JPEG segment while stripping");
    }

    const drop = marker === 0xe1 || marker === 0xfe;
    if (!drop) {
      spans.push({ start: markerStart, end: i + len });
    }
    i += len;

    if (marker === 0xda) {
      spans.push({ start: i, end: u8.length });
      sawSos = true;
      break;
    }
  }
  if (!sawSos && spanBytes(spans) < 4) {
    throw new StripMetadataError("JPEG strip produced empty output");
  }
  return copySpans(u8, spans);
}

const PNG_DROP = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME"]);

function stripPng(bytes: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (u8[i] !== sig[i]) {
      throw new StripMetadataError("Invalid PNG while stripping metadata");
    }
  }

  const spans: Span[] = [{ start: 0, end: 8 }];
  let i = 8;
  let sawIend = false;
  while (i + 12 <= u8.length) {
    const len = readU32(u8, i);
    const type = String.fromCharCode(u8[i + 4]!, u8[i + 5]!, u8[i + 6]!, u8[i + 7]!);
    const chunkEnd = i + 12 + len;
    if (chunkEnd > u8.length) {
      throw new StripMetadataError("Truncated PNG chunk while stripping");
    }
    if (!PNG_DROP.has(type)) {
      spans.push({ start: i, end: chunkEnd });
    }
    i = chunkEnd;
    if (type === "IEND") {
      sawIend = true;
      break;
    }
  }
  if (!sawIend) {
    throw new StripMetadataError("PNG missing IEND while stripping");
  }
  return copySpans(u8, spans);
}

function stripWebp(bytes: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  if (
    u8.length < 16 ||
    u8[0] !== 0x52 ||
    u8[1] !== 0x49 ||
    u8[2] !== 0x46 ||
    u8[3] !== 0x46 ||
    u8[8] !== 0x57 ||
    u8[9] !== 0x45 ||
    u8[10] !== 0x42 ||
    u8[11] !== 0x50
  ) {
    throw new StripMetadataError("Invalid WebP while stripping metadata");
  }

  const spans: Span[] = [];
  let i = 12;
  while (i + 8 <= u8.length) {
    const fourcc = String.fromCharCode(u8[i]!, u8[i + 1]!, u8[i + 2]!, u8[i + 3]!);
    let size = u8[i + 4]! | (u8[i + 5]! << 8) | (u8[i + 6]! << 16) | (u8[i + 7]! << 24);
    size = size >>> 0;
    const padded = size + (size % 2);
    const end = i + 8 + padded;
    if (end > u8.length) {
      throw new StripMetadataError("Truncated WebP chunk while stripping");
    }
    if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      spans.push({ start: i, end });
    }
    i = end;
  }
  const bodySize = spanBytes(spans);
  if (bodySize === 0) {
    throw new StripMetadataError("WebP strip removed all chunks");
  }

  const out = new Uint8Array(12 + bodySize);
  out[0] = 0x52;
  out[1] = 0x49;
  out[2] = 0x46;
  out[3] = 0x46;
  const riffSize = 4 + bodySize;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >> 8) & 0xff;
  out[6] = (riffSize >> 16) & 0xff;
  out[7] = (riffSize >> 24) & 0xff;
  out[8] = 0x57;
  out[9] = 0x45;
  out[10] = 0x42;
  out[11] = 0x50;
  let o = 12;
  for (const span of spans) {
    const len = span.end - span.start;
    out.set(u8.subarray(span.start, span.end), o);
    o += len;
  }
  return out.buffer;
}

/**
 * Application extensions are where GIF keeps XMP, so they go, but two of them
 * carry the animation loop count rather than metadata and dropping those would
 * leave an animation playing once.
 */
const GIF_KEEP_APP_EXTENSIONS = new Set(["NETSCAPE2.0", "ANIMEXTS1.0"]);

function stripGif(bytes: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  const headerOk =
    u8.length >= 14 &&
    u8[0] === 0x47 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x38 &&
    (u8[4] === 0x37 || u8[4] === 0x39) &&
    u8[5] === 0x61;
  if (!headerOk) {
    throw new StripMetadataError("Invalid GIF while stripping metadata");
  }

  const screen = u8[10]!;
  let i = 13;
  if (screen & 0x80) i += 3 * (1 << ((screen & 0x07) + 1));
  if (i > u8.length) {
    throw new StripMetadataError("Truncated GIF colour table while stripping");
  }

  const spans: Span[] = [{ start: 0, end: i }];
  let sawImage = false;

  while (i < u8.length) {
    const block = u8[i]!;

    if (block === 0x3b) {
      spans.push({ start: i, end: i + 1 });
      break;
    }

    if (block === 0x21) {
      if (i + 2 > u8.length) {
        throw new StripMetadataError("Truncated GIF extension while stripping");
      }
      const label = u8[i + 1]!;
      const dataStart = i + 2;
      const end = skipGifSubBlocks(u8, dataStart);
      const drop =
        label === 0xfe ||
        (label === 0xff && !isRetainedGifAppExtension(u8, dataStart));
      if (!drop) spans.push({ start: i, end });
      i = end;
      continue;
    }

    if (block === 0x2c) {
      if (i + 10 > u8.length) {
        throw new StripMetadataError("Truncated GIF image header while stripping");
      }
      const local = u8[i + 9]!;
      let cursor = i + 10;
      if (local & 0x80) cursor += 3 * (1 << ((local & 0x07) + 1));
      cursor += 1;
      if (cursor > u8.length) {
        throw new StripMetadataError("Truncated GIF image data while stripping");
      }
      const end = skipGifSubBlocks(u8, cursor);
      spans.push({ start: i, end });
      sawImage = true;
      i = end;
      continue;
    }

    throw new StripMetadataError("Unknown GIF block while stripping");
  }

  /**
   * A missing trailer is tolerated because browsers render such files and GIF
   * used to be passed through untouched, so rejecting them here would turn a
   * metadata change into an upload regression. Losing the frames is not.
   */
  if (!sawImage) {
    throw new StripMetadataError("GIF has no image data");
  }
  return copySpans(u8, spans);
}

/** The identifier is the first sub-block of an application extension, always 11 bytes. */
function isRetainedGifAppExtension(u8: Uint8Array, dataStart: number): boolean {
  if (u8[dataStart] !== 0x0b || dataStart + 12 > u8.length) return false;
  let id = "";
  for (let i = dataStart + 1; i < dataStart + 12; i++) id += String.fromCharCode(u8[i]!);
  return GIF_KEEP_APP_EXTENSIONS.has(id);
}

/** Walks the length-prefixed chain and returns the index just past its terminator. */
function skipGifSubBlocks(u8: Uint8Array, start: number): number {
  let i = start;
  while (i < u8.length) {
    const len = u8[i]!;
    if (len === 0) return i + 1;
    i += 1 + len;
  }
  throw new StripMetadataError("Truncated GIF sub-block while stripping");
}

function spanBytes(spans: Span[]): number {
  let n = 0;
  for (const span of spans) n += span.end - span.start;
  return n;
}

function copySpans(u8: Uint8Array, spans: Span[]): ArrayBuffer {
  const out = new Uint8Array(spanBytes(spans));
  let o = 0;
  for (const span of spans) {
    out.set(u8.subarray(span.start, span.end), o);
    o += span.end - span.start;
  }
  return out.buffer;
}

function readU32(u8: Uint8Array, i: number): number {
  return (
    ((u8[i]! << 24) | (u8[i + 1]! << 16) | (u8[i + 2]! << 8) | u8[i + 3]!) >>> 0
  );
}
