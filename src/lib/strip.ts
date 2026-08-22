/** Strip EXIF/XMP/text metadata. On parse failure, returns original bytes. */

import type { AllowedMime } from "../types";

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
        return bytes; // GIF has no EXIF; leave as-is
    }
  } catch {
    return bytes;
  }
}

function stripJpeg(bytes: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  if (u8.length < 4 || u8[0] !== 0xff || u8[1] !== 0xd8) return bytes;

  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < u8.length) {
    if (u8[i] !== 0xff) {
      // Entropy-coded data — copy rest
      for (let j = i; j < u8.length; j++) out.push(u8[j]!);
      break;
    }
    // Skip fill bytes
    while (i < u8.length && u8[i] === 0xff) i++;
    if (i >= u8.length) break;
    const marker = u8[i]!;
    i++;

    // Standalone markers
    if (marker === 0xd9 || marker === 0xd8) {
      out.push(0xff, marker);
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      out.push(0xff, marker);
      continue;
    }

    if (i + 1 >= u8.length) break;
    const len = (u8[i]! << 8) | u8[i + 1]!;
    if (len < 2 || i + len > u8.length) break;

    // Drop APP1 (Exif/XMP) and COM
    const drop = marker === 0xe1 || marker === 0xfe;
    if (!drop) {
      out.push(0xff, marker);
      for (let j = 0; j < len; j++) out.push(u8[i + j]!);
    }
    i += len;

    // After SOS, remaining is scan data
    if (marker === 0xda) {
      for (let j = i; j < u8.length; j++) out.push(u8[j]!);
      break;
    }
  }
  return new Uint8Array(out).buffer;
}

const PNG_DROP = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME"]);

function stripPng(bytes: ArrayBuffer): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (u8[i] !== sig[i]) return bytes;
  }

  const parts: Uint8Array[] = [u8.slice(0, 8)];
  let i = 8;
  while (i + 12 <= u8.length) {
    const len = readU32(u8, i);
    const type = String.fromCharCode(u8[i + 4]!, u8[i + 5]!, u8[i + 6]!, u8[i + 7]!);
    const chunkEnd = i + 12 + len;
    if (chunkEnd > u8.length) return bytes;
    if (!PNG_DROP.has(type)) {
      parts.push(u8.slice(i, chunkEnd));
    }
    i = chunkEnd;
    if (type === "IEND") break;
  }
  return concat(parts);
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
    return bytes;
  }

  const kept: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= u8.length) {
    const fourcc = String.fromCharCode(u8[i]!, u8[i + 1]!, u8[i + 2]!, u8[i + 3]!);
    let size = u8[i + 4]! | (u8[i + 5]! << 8) | (u8[i + 6]! << 16) | (u8[i + 7]! << 24);
    // RIFF chunk sizes are little-endian; treat as unsigned
    size = size >>> 0;
    const padded = size + (size % 2);
    const end = i + 8 + padded;
    if (end > u8.length) return bytes;
    if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      kept.push(u8.slice(i, end));
    }
    i = end;
  }

  const body = concat(kept);
  const out = new Uint8Array(12 + body.byteLength);
  out.set([0x52, 0x49, 0x46, 0x46], 0);
  const riffSize = 4 + body.byteLength;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >> 8) & 0xff;
  out[6] = (riffSize >> 16) & 0xff;
  out[7] = (riffSize >> 24) & 0xff;
  out.set([0x57, 0x45, 0x42, 0x50], 8);
  out.set(new Uint8Array(body), 12);
  return out.buffer;
}

function readU32(u8: Uint8Array, i: number): number {
  return (
    ((u8[i]! << 24) | (u8[i + 1]! << 16) | (u8[i + 2]! << 8) | u8[i + 3]!) >>> 0
  );
}

function concat(parts: Uint8Array[]): ArrayBuffer {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.byteLength;
  }
  return out.buffer;
}
