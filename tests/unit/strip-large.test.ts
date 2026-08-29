import { describe, expect, it } from "vitest";
import { inspectImage } from "../../src/lib/inspect";
import { stripMetadata } from "../../src/lib/strip";

function jpegWithScan(scanBytes: number): ArrayBuffer {
  const head = [
    0xff, 0xd8,
    0xff, 0xe1, 0x00, 0x10, ...Array(14).fill(0),
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  ];
  const out = new Uint8Array(head.length + scanBytes + 2);
  out.set(head, 0);
  out.fill(0x11, head.length, head.length + scanBytes);
  out[out.length - 2] = 0xff;
  out[out.length - 1] = 0xd9;
  return out.buffer;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  return out;
}

function pngWithText(textBytes: number): ArrayBuffer {
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = PNG_1x1.slice(8, 8 + 12 + 13);
  const text = pngChunk("tEXt", new Uint8Array(textBytes).fill(0x41));
  const iend = PNG_1x1.slice(PNG_1x1.length - 12);
  const out = new Uint8Array(sig.length + ihdr.length + text.length + iend.length);
  out.set(sig, 0);
  out.set(ihdr, sig.length);
  out.set(text, sig.length + ihdr.length);
  out.set(iend, sig.length + ihdr.length + text.length);
  return out.buffer;
}

function webpWithExif(exifBytes: number): ArrayBuffer {
  const vp8 = Uint8Array.from([
    0x56, 0x50, 0x38, 0x20, 0x0a, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00,
  ]);
  const exif = new Uint8Array(8 + exifBytes);
  exif.set([0x45, 0x58, 0x49, 0x46], 0);
  exif[4] = exifBytes & 0xff;
  exif[5] = (exifBytes >> 8) & 0xff;
  exif[6] = (exifBytes >> 16) & 0xff;
  exif[7] = (exifBytes >> 24) & 0xff;
  const body = vp8.length + exif.length;
  const out = new Uint8Array(12 + body);
  out.set([0x52, 0x49, 0x46, 0x46], 0);
  const riff = 4 + body;
  out[4] = riff & 0xff;
  out[5] = (riff >> 8) & 0xff;
  out[6] = (riff >> 16) & 0xff;
  out[7] = (riff >> 24) & 0xff;
  out.set([0x57, 0x45, 0x42, 0x50], 8);
  out.set(vp8, 12);
  out.set(exif, 12 + vp8.length);
  return out.buffer;
}

const PNG_1x1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

describe("stripMetadata large files", () => {
  it("strips APP1 from an 8 MB constructed JPEG without failing", () => {
    const jpeg = jpegWithScan(8 * 1024 * 1024);
    const stripped = new Uint8Array(stripMetadata(jpeg, "image/jpeg"));
    const hasApp1 = [...stripped.slice(0, 64)].some(
      (_, i) => stripped[i] === 0xff && stripped[i + 1] === 0xe1,
    );
    expect(hasApp1).toBe(false);
    expect(stripped.byteLength).toBeGreaterThan(8 * 1024 * 1024);
    expect(stripped.buffer.byteLength).toBe(stripped.byteLength);
    const r = inspectImage(stripped.buffer);
    expect(r.ok).toBe(true);
  });

  it("strips a 4 MB PNG tEXt chunk into an exact output buffer", () => {
    const png = pngWithText(4 * 1024 * 1024);
    const stripped = new Uint8Array(stripMetadata(png, "image/png"));
    expect(stripped.byteLength).toBeLessThan(png.byteLength / 2);
    expect(stripped.buffer.byteLength).toBe(stripped.byteLength);
    const r = inspectImage(stripped.buffer);
    expect(r.ok).toBe(true);
  });

  it("strips a 4 MB WebP EXIF chunk into an exact output buffer", () => {
    const webp = webpWithExif(4 * 1024 * 1024);
    const stripped = new Uint8Array(stripMetadata(webp, "image/webp"));
    expect(stripped.byteLength).toBeLessThan(webp.byteLength / 2);
    expect(stripped.buffer.byteLength).toBe(stripped.byteLength);
    const r = inspectImage(stripped.buffer);
    expect(r.ok).toBe(true);
  });
});
