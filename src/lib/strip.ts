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
        return bytes;
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
