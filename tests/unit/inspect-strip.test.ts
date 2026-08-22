import { describe, expect, it } from "vitest";
import { inspectImage } from "../../src/lib/inspect";
import { resolveIpHashSecret } from "../../src/lib/secrets";
import { StripMetadataError, stripMetadata } from "../../src/lib/strip";
import { generateSlug, isValidSlug } from "../../src/lib/slug";
import {
  generateDeleteToken,
  hashDeleteToken,
  verifyDeleteToken,
} from "../../src/lib/tokens";

/** Minimal valid 1×1 PNG (complete IHDR/IDAT/IEND) */
const PNG_1x1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

/** Minimal GIF 1×1 */
const GIF_1x1 = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

function pngWithDeclaredSize(w: number, h: number): ArrayBuffer {
  const u8 = new Uint8Array(PNG_1x1);
  const view = new DataView(u8.buffer);
  view.setUint32(16, w);
  view.setUint32(20, h);
  // CRC will be wrong but we only read dimensions from IHDR
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

describe("inspectImage", () => {
  it("accepts PNG and reads 1×1", () => {
    const r = inspectImage(PNG_1x1.buffer);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("image/png");
      expect(r.width).toBe(1);
      expect(r.height).toBe(1);
    }
  });

  it("accepts GIF and reads 1×1", () => {
    const r = inspectImage(GIF_1x1.buffer);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("image/gif");
      expect(r.width).toBe(1);
      expect(r.height).toBe(1);
    }
  });

  it("rejects SVG", () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const r = inspectImage(svg.buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("svg");
  });

  it("rejects HTML renamed as image", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>hi</body></html>");
    const r = inspectImage(html.buffer);
    expect(r.ok).toBe(false);
  });

  it("rejects megapixel bomb headers", () => {
    const r = inspectImage(pngWithDeclaredSize(30000, 30000));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_many_pixels");
  });

  it("rejects truncated buffers", () => {
    const r = inspectImage(new Uint8Array([0x89, 0x50, 0x4e]).buffer);
    expect(r.ok).toBe(false);
  });
});

describe("stripMetadata", () => {
  it("keeps PNG pixels valid after strip", () => {
    const out = stripMetadata(PNG_1x1.buffer, "image/png");
    const r = inspectImage(out);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("image/png");
  });

  it("removes JPEG APP1 (Exif) segments", () => {
    const parts: number[] = [0xff, 0xd8];
    parts.push(0xff, 0xe1, 0x00, 0x10);
    for (let i = 0; i < 14; i++) parts.push(0x00);
    parts.push(0xff, 0xfe, 0x00, 0x04, 0x41, 0x42);
    parts.push(
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    );
    parts.push(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x00, 0xff, 0xd9);
    const jpeg = new Uint8Array(parts).buffer;
    const stripped = new Uint8Array(stripMetadata(jpeg, "image/jpeg"));
    const hasApp1 = [...stripped].some(
      (_, i) => stripped[i] === 0xff && stripped[i + 1] === 0xe1,
    );
    expect(hasApp1).toBe(false);
    const r = inspectImage(stripped.buffer);
    expect(r.ok).toBe(true);
  });

  it("fails closed on truncated PNG", () => {
    const truncated = PNG_1x1.slice(0, 20).buffer;
    expect(() => stripMetadata(truncated, "image/png")).toThrow(StripMetadataError);
  });

  it("leaves GIF unchanged", () => {
    const out = stripMetadata(GIF_1x1.buffer, "image/gif");
    expect(new Uint8Array(out)).toEqual(GIF_1x1);
  });
});

describe("resolveIpHashSecret", () => {
  it("allows placeholder only in development", () => {
    expect(
      resolveIpHashSecret({ ENVIRONMENT: "development", IP_HASH_SECRET: "" }),
    ).toEqual({ ok: true, secret: "dev-ip-hash-secret-change-me" });
  });

  it("fails closed in production without a real secret", () => {
    expect(
      resolveIpHashSecret({ ENVIRONMENT: "production", IP_HASH_SECRET: "" }),
    ).toEqual({ ok: false });
    expect(
      resolveIpHashSecret({
        ENVIRONMENT: "staging",
        IP_HASH_SECRET: "dev-ip-hash-secret-change-me",
      }),
    ).toEqual({ ok: false });
  });

  it("accepts a real production secret", () => {
    expect(
      resolveIpHashSecret({
        ENVIRONMENT: "production",
        IP_HASH_SECRET: "real-secret-value",
      }),
    ).toEqual({ ok: true, secret: "real-secret-value" });
  });
});

describe("slug", () => {
  it("generates 8-char base58-ish slugs", () => {
    const s = generateSlug();
    expect(s).toHaveLength(8);
    expect(isValidSlug(s)).toBe(true);
  });

  it("rejects short or invalid slugs", () => {
    expect(isValidSlug("abc")).toBe(false);
    expect(isValidSlug("00000000")).toBe(false);
  });
});

describe("delete tokens", () => {
  it("verifies hashed tokens in constant-time path", async () => {
    const token = generateDeleteToken();
    const hash = await hashDeleteToken(token);
    expect(await verifyDeleteToken(token, hash)).toBe(true);
    expect(await verifyDeleteToken("wrong-token-value-here!!!!!!!!!!!", hash)).toBe(
      false,
    );
  });
});
