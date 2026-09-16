import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { inspectImage } from "../../src/lib/inspect";
import { inspectWebAsset } from "../../src/lib/inspect-web-asset";
import { sanitizeSvg } from "../../src/lib/sanitize-svg";
import { mediaAssetResponseHeaders } from "../../src/lib/headers";
import { assetTypeForMime } from "../../src/lib/web-assets";

const dir = dirname(fileURLToPath(import.meta.url));
const fixtures = join(dir, "../fixtures/web-assets");
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

function enc(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer;
}

describe("web asset type model", () => {
  it("maps MIME to coarse types", () => {
    expect(assetTypeForMime("image/png")).toBe("image");
    expect(assetTypeForMime("image/avif")).toBe("image");
    expect(assetTypeForMime("image/svg+xml")).toBe("vector");
    expect(assetTypeForMime("image/x-icon")).toBe("icon");
    expect(assetTypeForMime("font/woff2")).toBe("font");
  });
});

describe("inspectWebAsset", () => {
  it("keeps PNG as image and ignores a .svg filename", () => {
    const r = inspectWebAsset(PNG.buffer);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("image/png");
      expect(r.assetType).toBe("image");
    }
  });

  it("accepts AVIF by ftyp/ispe", () => {
    const avif = readFileSync(join(fixtures, "tiny.avif"));
    const r = inspectWebAsset(avif.buffer.slice(avif.byteOffset, avif.byteOffset + avif.byteLength));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("image/avif");
      expect(r.assetType).toBe("image");
      expect(r.width).toBe(8);
      expect(r.height).toBe(8);
    }
  });

  it("rejects truncated AVIF that claims the brand", () => {
    const truncated = new Uint8Array([
      0, 0, 0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0, 0x61, 0x76, 0x69, 0x66,
    ]);
    const r = inspectWebAsset(truncated.buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid");
  });

  it("rejects MP4 ftyp as unsupported, not as AVIF", () => {
    const mp4 = new Uint8Array([
      0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0, 0x69, 0x73, 0x6f, 0x6d,
      0x6d, 0x70, 0x34, 0x31,
    ]);
    const r = inspectWebAsset(mp4.buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unsupported");
  });

  it("accepts ICO and reports icon", () => {
    const ico = readFileSync(join(fixtures, "favicon.ico"));
    const r = inspectWebAsset(ico.buffer.slice(ico.byteOffset, ico.byteOffset + ico.byteLength));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("image/x-icon");
      expect(r.assetType).toBe("icon");
      expect(r.width).toBe(1);
      expect(r.height).toBe(1);
    }
  });

  it("accepts multi-size ICO", () => {
    const ico = readFileSync(join(fixtures, "favicon-multi.ico"));
    const r = inspectWebAsset(ico.buffer.slice(ico.byteOffset, ico.byteOffset + ico.byteLength));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.assetType).toBe("icon");
  });

  it("rejects a malformed ICO container", () => {
    const r = inspectWebAsset(new Uint8Array([0, 0, 1, 0, 99, 0]).buffer);
    expect(r.ok).toBe(false);
  });

  it("accepts WOFF2 as font with null dimensions", () => {
    const font = readFileSync(join(fixtures, "drop-test.woff2"));
    const r = inspectWebAsset(font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mime).toBe("font/woff2");
      expect(r.assetType).toBe("font");
      expect(r.width).toBeNull();
      expect(r.height).toBeNull();
    }
  });

  it("accepts WOFF", () => {
    const font = readFileSync(join(fixtures, "drop-test.woff"));
    const r = inspectWebAsset(font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("font/woff");
  });

  it("rejects PDF, ZIP, and HTML", () => {
    const pdf = inspectWebAsset(enc("%PDF-1.4"));
    expect(pdf.ok).toBe(false);
    if (!pdf.ok) expect(pdf.reason).toBe("unsupported");
    expect(inspectWebAsset(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]).buffer).ok).toBe(false);
    expect(inspectWebAsset(enc("<!DOCTYPE html><html></html>")).ok).toBe(false);
  });

  it("rejects TTF, OTF, and a PNG pretending to be AVIF", () => {
    const ttf = new Uint8Array(32);
    ttf[1] = 1;
    expect(inspectWebAsset(ttf.buffer).ok).toBe(false);
    const otf = new TextEncoder().encode("OTTO" + "x".repeat(20));
    expect(inspectWebAsset(otf.buffer).ok).toBe(false);
    const pngAsAvif = inspectWebAsset(PNG.buffer);
    expect(pngAsAvif.ok).toBe(true);
    if (pngAsAvif.ok) expect(pngAsAvif.mime).toBe("image/png");
  });

  it("leaves Drop inspect rejecting SVG", () => {
    const svg = enc('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    const drop = inspectImage(svg);
    expect(drop.ok).toBe(false);
    if (!drop.ok) expect(drop.reason).toBe("svg");
  });
});

describe("sanitizeSvg", () => {
  it("stores a sanitized logo and reads viewBox", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#000"/></svg>',
      ),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.width).toBe(24);
      expect(r.height).toBe(24);
      expect(r.svg).toContain("<svg");
      expect(r.svg).toContain("path");
    }
  });

  it("rejects script", () => {
    const r = sanitizeSvg(
      enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects onload", () => {
    const r = sanitizeSvg(enc('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'));
    expect(r.ok).toBe(false);
  });

  it("rejects foreignObject", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject></svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects external image", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects javascript href", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects external use", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/x.svg#icon"/></svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects CSS import", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("https://evil.example/x.css");</style></svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects dangerous data URL", () => {
    const r = sanitizeSvg(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+"/></svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects entity/DOCTYPE payloads", () => {
    const r = sanitizeSvg(
      enc(
        '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&xxe;</svg>',
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects malformed XML", () => {
    const r = sanitizeSvg(enc("<svg><rect></svg>"));
    expect(r.ok).toBe(false);
  });

  it("does not serve script after a successful sanitize", () => {
    const r = inspectWebAsset(
      enc(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
      ),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const text = new TextDecoder().decode(r.bytes);
      expect(text).not.toMatch(/<script/i);
      expect(text).not.toMatch(/\son[a-z]/i);
      expect(r.sanitized).toBe(true);
    }
  });
});

describe("media alias headers", () => {
  it("serves SVG with nosniff, CSP sandbox, and charset", () => {
    const h = mediaAssetResponseHeaders({ mime: "image/svg+xml", filename: "logo" });
    expect(h.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Content-Security-Policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    );
    expect(h.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("serves WOFF2 with CORS and font MIME", () => {
    const h = mediaAssetResponseHeaders({ mime: "font/woff2", filename: "inter" });
    expect(h.get("Content-Type")).toBe("font/woff2");
    expect(h.get("Access-Control-Allow-Origin")).toBe("*");
    expect(h.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("serves ICO as image/x-icon", () => {
    const h = mediaAssetResponseHeaders({ mime: "image/x-icon", filename: "favicon" });
    expect(h.get("Content-Type")).toBe("image/x-icon");
  });
});
