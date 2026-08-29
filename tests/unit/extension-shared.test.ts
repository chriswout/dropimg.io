import { describe, expect, it } from "vitest";
import {
  CAPTURE_GAP_MS,
  dataUrlToArrayBuffer,
  isRestrictedUrl,
} from "../../extension/src/shared";
import { MESSAGES } from "../../extension/src/messages";

describe("extension shared helpers", () => {
  it("keeps capture throttle above Chrome's 2/sec limit", () => {
    expect(CAPTURE_GAP_MS).toBeGreaterThanOrEqual(550);
  });

  it("flags restricted browser pages", () => {
    expect(isRestrictedUrl("chrome://extensions")).toBe(true);
    expect(isRestrictedUrl("https://dropimg.io")).toBe(false);
  });

  it("ships matching locale catalogs", () => {
    const keys = Object.keys(MESSAGES.en).sort();
    for (const locale of ["es", "pt_BR", "de"] as const) {
      expect(Object.keys(MESSAGES[locale]).sort()).toEqual(keys);
    }
    expect(MESSAGES.en.takenSecsAgo).toContain("$1$");
    expect(MESSAGES.en.takenMinsAgoPlural).toContain("$1$");
  });

  it("decodes a tiny PNG data URL", () => {
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const buf = dataUrlToArrayBuffer(dataUrl);
    expect(buf.byteLength).toBeGreaterThan(20);
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
  });
});
