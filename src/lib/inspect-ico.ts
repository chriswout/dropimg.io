import { MAX_MEGAPIXELS } from "../types";

export type IcoInspect =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "invalid" | "too_many_pixels" };

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Windows ICO (type 1). CUR (type 2) is rejected. Entries may embed PNG or DIB.
 */
export function inspectIco(u8: Uint8Array): IcoInspect {
  if (u8.byteLength < 22) return { ok: false, reason: "invalid" };
  const reserved = u8[0]! | (u8[1]! << 8);
  const type = u8[2]! | (u8[3]! << 8);
  const count = u8[4]! | (u8[5]! << 8);
  if (reserved !== 0 || type !== 1 || count === 0 || count > 64) {
    return { ok: false, reason: "invalid" };
  }
  const dirEnd = 6 + count * 16;
  if (u8.byteLength < dirEnd) return { ok: false, reason: "invalid" };

  let maxW = 0;
  let maxH = 0;
  for (let n = 0; n < count; n++) {
    const e = 6 + n * 16;
    const wByte = u8[e]!;
    const hByte = u8[e + 1]!;
    const bytes = readU32le(u8, e + 8);
    const offset = readU32le(u8, e + 12);
    if (bytes === 0 || offset < dirEnd || offset + bytes > u8.byteLength) {
      return { ok: false, reason: "invalid" };
    }
    const blob = u8.subarray(offset, offset + bytes);
    const dim = icoImageSize(blob, wByte, hByte);
    if (!dim) return { ok: false, reason: "invalid" };
    if (dim.w * dim.h > MAX_MEGAPIXELS) return { ok: false, reason: "too_many_pixels" };
    if (dim.w >= maxW && dim.h >= maxH) {
      maxW = dim.w;
      maxH = dim.h;
    }
  }
  if (maxW === 0 || maxH === 0) return { ok: false, reason: "invalid" };
  return { ok: true, width: maxW, height: maxH };
}

function icoImageSize(
  blob: Uint8Array,
  wByte: number,
  hByte: number,
): { w: number; h: number } | null {
  if (isPng(blob) && blob.length >= 24) {
    const w = readU32be(blob, 16);
    const h = readU32be(blob, 20);
    if (w === 0 || h === 0) return null;
    return { w, h };
  }
  if (blob.length >= 16) {
    const headerSize = readU32le(blob, 0);
    if (headerSize >= 40) {
      const w = readU32le(blob, 4);
      const hFull = readU32le(blob, 8);
      const h = Math.floor(hFull / 2) || hFull;
      if (w === 0 || h === 0) return null;
      return { w, h };
    }
  }
  const w = wByte === 0 ? 256 : wByte;
  const h = hByte === 0 ? 256 : hByte;
  return { w, h };
}

function isPng(u8: Uint8Array): boolean {
  if (u8.length < 8) return false;
  for (let i = 0; i < 8; i++) if (u8[i] !== PNG_SIG[i]) return false;
  return true;
}

function readU32le(u8: Uint8Array, i: number): number {
  return (
    (u8[i]! | (u8[i + 1]! << 8) | (u8[i + 2]! << 16) | (u8[i + 3]! << 24)) >>> 0
  );
}

function readU32be(u8: Uint8Array, i: number): number {
  return ((u8[i]! << 24) | (u8[i + 1]! << 16) | (u8[i + 2]! << 8) | (u8[i + 3]!) ) >>> 0;
}
