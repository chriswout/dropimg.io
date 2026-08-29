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

describe("stripMetadata large JPEG", () => {
  it("strips APP1 from an 8 MB constructed JPEG without failing", () => {
    const jpeg = jpegWithScan(8 * 1024 * 1024);
    const stripped = new Uint8Array(stripMetadata(jpeg, "image/jpeg"));
    const hasApp1 = [...stripped.slice(0, 64)].some(
      (_, i) => stripped[i] === 0xff && stripped[i + 1] === 0xe1,
    );
    expect(hasApp1).toBe(false);
    expect(stripped.byteLength).toBeGreaterThan(8 * 1024 * 1024);
    const r = inspectImage(stripped.buffer);
    expect(r.ok).toBe(true);
  });
});
