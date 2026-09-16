export type WoffInspect = { ok: true } | { ok: false; reason: "invalid" };

const MAX_TABLES = 48;

export function inspectWoff(u8: Uint8Array): WoffInspect {
  if (u8.byteLength < 44) return { ok: false, reason: "invalid" };
  if (!eq4(u8, 0, 0x77, 0x4f, 0x46, 0x46)) return { ok: false, reason: "invalid" }; // wOFF
  const length = readU32(u8, 8);
  const numTables = readU16(u8, 12);
  const reserved = readU16(u8, 14);
  if (length !== u8.byteLength || reserved !== 0 || numTables < 1 || numTables > MAX_TABLES) {
    return { ok: false, reason: "invalid" };
  }
  const dirEnd = 44 + numTables * 20;
  if (dirEnd > u8.byteLength) return { ok: false, reason: "invalid" };
  const seen = new Set<string>();
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = readType(u8, o);
    const offset = readU32(u8, o + 4);
    const compLength = readU32(u8, o + 8);
    const origLength = readU32(u8, o + 12);
    if (tag.length !== 4 || seen.has(tag)) return { ok: false, reason: "invalid" };
    seen.add(tag);
    if (origLength === 0 || origLength > 16 * 1024 * 1024) return { ok: false, reason: "invalid" };
    if (compLength === 0 || offset < dirEnd || offset + compLength > u8.byteLength) {
      return { ok: false, reason: "invalid" };
    }
  }
  return { ok: true };
}

export function inspectWoff2(u8: Uint8Array): WoffInspect {
  if (u8.byteLength < 48) return { ok: false, reason: "invalid" };
  if (!eq4(u8, 0, 0x77, 0x4f, 0x46, 0x32)) return { ok: false, reason: "invalid" }; // wOF2
  const length = readU32(u8, 8);
  const numTables = readU16(u8, 12);
  const reserved = readU16(u8, 14);
  const totalCompressedSize = readU32(u8, 20);
  const metaOffset = readU32(u8, 28);
  const metaLength = readU32(u8, 32);
  const privOffset = readU32(u8, 40);
  const privLength = readU32(u8, 44);
  if (length !== u8.byteLength || reserved !== 0 || numTables < 1 || numTables > MAX_TABLES) {
    return { ok: false, reason: "invalid" };
  }
  let i = 48;
  for (let n = 0; n < numTables; n++) {
    if (i >= u8.byteLength) return { ok: false, reason: "invalid" };
    const flags = u8[i]!;
    i += 1;
    const tagBits = flags & 0x3f;
    const transform = (flags >> 6) & 0x03;
    if (tagBits === 63) {
      if (i + 4 > u8.byteLength) return { ok: false, reason: "invalid" };
      i += 4;
    }
    const orig = readBase128(u8, i);
    if (!orig) return { ok: false, reason: "invalid" };
    i = orig.next;
    if (orig.value === 0 || orig.value > 16 * 1024 * 1024) return { ok: false, reason: "invalid" };
    // Transformed glyf/loca (and any non-"no-transform" table) carry transformLength.
    if (transform !== 0 && transform !== 3) {
      const tr = readBase128(u8, i);
      if (!tr) return { ok: false, reason: "invalid" };
      i = tr.next;
    } else if ((tagBits === 10 || tagBits === 11) && transform !== 3) {
      const tr = readBase128(u8, i);
      if (!tr) return { ok: false, reason: "invalid" };
      i = tr.next;
    }
  }
  const compressedStart = i;
  const compressedEnd = compressedStart + totalCompressedSize;
  if (totalCompressedSize === 0 || compressedEnd > u8.byteLength) {
    return { ok: false, reason: "invalid" };
  }
  if (!optionalBlockOk(u8.byteLength, metaOffset, metaLength, compressedEnd)) {
    return { ok: false, reason: "invalid" };
  }
  if (!optionalBlockOk(u8.byteLength, privOffset, privLength, compressedEnd)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}

function optionalBlockOk(
  fileLength: number,
  offset: number,
  size: number,
  afterCompressed: number,
): boolean {
  if (offset === 0 && size === 0) return true;
  if (offset === 0 || size === 0) return false;
  if (offset < afterCompressed) return false;
  return offset + size <= fileLength;
}

function readBase128(u8: Uint8Array, start: number): { value: number; next: number } | null {
  let acc = 0;
  for (let n = 0; n < 5; n++) {
    if (start + n >= u8.byteLength) return null;
    const b = u8[start + n]!;
    if (n === 0 && b === 0x80) return null;
    acc = (acc << 7) | (b & 0x7f);
    if (acc > 0x7fffffff) return null;
    if ((b & 0x80) === 0) return { value: acc, next: start + n + 1 };
  }
  return null;
}

function eq4(u8: Uint8Array, i: number, a: number, b: number, c: number, d: number): boolean {
  return u8[i] === a && u8[i + 1] === b && u8[i + 2] === c && u8[i + 3] === d;
}

function readType(u8: Uint8Array, i: number): string {
  return String.fromCharCode(u8[i]!, u8[i + 1]!, u8[i + 2]!, u8[i + 3]!);
}

function readU16(u8: Uint8Array, i: number): number {
  return (u8[i]! << 8) | u8[i + 1]!;
}

function readU32(u8: Uint8Array, i: number): number {
  return ((u8[i]! << 24) | (u8[i + 1]! << 16) | (u8[i + 2]! << 8) | u8[i + 3]!) >>> 0;
}
