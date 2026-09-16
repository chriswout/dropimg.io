import { MAX_MEGAPIXELS } from "../types";

export type AvifInspect =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "invalid" | "too_many_pixels" };

/**
 * ISO BMFF walker for still AVIF. Does not decode AV1. Requires ftyp brand avif/avis
 * and an ispe box for canvas size.
 */
export function inspectAvif(u8: Uint8Array): AvifInspect {
  if (u8.byteLength < 24) return { ok: false, reason: "invalid" };
  const boxes = readBoxes(u8, 0, u8.byteLength);
  if (!boxes) return { ok: false, reason: "invalid" };
  const ftyp = boxes.find((b) => b.type === "ftyp");
  if (!ftyp) return { ok: false, reason: "invalid" };
  if (!ftypHasAvif(u8, ftyp)) return { ok: false, reason: "invalid" };

  const ispe = findBox(u8, boxes, "ispe");
  if (!ispe || ispe.size < 16) return { ok: false, reason: "invalid" };
  // FullBox: version+flags (4) then width/height
  const payload = ispe.start + 8;
  if (payload + 12 > u8.byteLength) return { ok: false, reason: "invalid" };
  const width = readU32(u8, payload + 4);
  const height = readU32(u8, payload + 8);
  if (width === 0 || height === 0) return { ok: false, reason: "invalid" };
  if (width * height > MAX_MEGAPIXELS) return { ok: false, reason: "too_many_pixels" };
  return { ok: true, width, height };
}

type Box = { type: string; start: number; size: number; contentStart: number; contentEnd: number };

function readBoxes(u8: Uint8Array, start: number, end: number): Box[] | null {
  const out: Box[] = [];
  let i = start;
  while (i + 8 <= end) {
    let size = readU32(u8, i);
    const type = readType(u8, i + 4);
    let header = 8;
    if (size === 1) {
      if (i + 16 > end) return null;
      size = readU64(u8, i + 8);
      header = 16;
    } else if (size === 0) {
      size = end - i;
    }
    if (size < header || i + size > end) return null;
    if (!/^[A-Za-z0-9 ]{4}$/.test(type)) return null;
    out.push({
      type,
      start: i,
      size,
      contentStart: i + header,
      contentEnd: i + size,
    });
    i += size;
  }
  if (i !== end) return null;
  return out;
}

function findBox(u8: Uint8Array, boxes: Box[], want: string): Box | null {
  for (const box of boxes) {
    if (box.type === want) return box;
    if (CONTAINER.has(box.type)) {
      const nestedStart = box.type === "meta" ? skipFullBox(u8, box) : box.contentStart;
      if (nestedStart == null) continue;
      const nested = readBoxes(u8, nestedStart, box.contentEnd);
      if (!nested) continue;
      const hit = findBox(u8, nested, want);
      if (hit) return hit;
    }
  }
  return null;
}

function skipFullBox(u8: Uint8Array, box: Box): number | null {
  // meta/iprp are FullBoxes: 4 extra bytes after the header
  if (box.contentStart + 4 > box.contentEnd) return null;
  return box.contentStart + 4;
}

const CONTAINER = new Set(["meta", "iprp", "ipco", "moov", "trak", "mdia", "minf", "stbl"]);

function ftypHasAvif(u8: Uint8Array, box: Box): boolean {
  if (box.contentEnd - box.contentStart < 8) return false;
  const brands: string[] = [];
  brands.push(readType(u8, box.contentStart));
  for (let i = box.contentStart + 8; i + 4 <= box.contentEnd; i += 4) {
    brands.push(readType(u8, i));
  }
  return brands.includes("avif") || brands.includes("avis");
}

function readType(u8: Uint8Array, i: number): string {
  return String.fromCharCode(u8[i]!, u8[i + 1]!, u8[i + 2]!, u8[i + 3]!);
}

function readU32(u8: Uint8Array, i: number): number {
  return ((u8[i]! << 24) | (u8[i + 1]! << 16) | (u8[i + 2]! << 8) | u8[i + 3]!) >>> 0;
}

function readU64(u8: Uint8Array, i: number): number {
  const hi = readU32(u8, i);
  const lo = readU32(u8, i + 4);
  if (hi !== 0) return Number.MAX_SAFE_INTEGER;
  return lo;
}
