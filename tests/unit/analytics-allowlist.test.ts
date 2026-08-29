import { describe, expect, it } from "vitest";
import { normalizePageIntent, PAGE_INTENTS } from "../../src/lib/page-intent";
import {
  isKnownUploadClient,
  normalizeUploadClient,
} from "../../src/lib/upload-client";

describe("normalizeUploadClient", () => {
  it("defaults empty to web", () => {
    expect(normalizeUploadClient(undefined)).toBe("web");
    expect(normalizeUploadClient("")).toBe("web");
  });

  it("allowlists known clients", () => {
    expect(normalizeUploadClient("sharex")).toBe("sharex");
    expect(normalizeUploadClient("Chrome-Extension")).toBe("chrome-extension");
    expect(isKnownUploadClient("edge-extension")).toBe(true);
  });

  it("maps unknown to other", () => {
    expect(normalizeUploadClient("evil-bot")).toBe("other");
    expect(normalizeUploadClient("https://evil.example")).toBe("other");
  });
});

describe("normalizePageIntent", () => {
  it("accepts only allowlisted IDs", () => {
    for (const id of PAGE_INTENTS) {
      expect(normalizePageIntent(id)).toBe(id);
    }
    expect(normalizePageIntent("HOME")).toBe("home");
  });

  it("rejects URLs and free-form values", () => {
    expect(normalizePageIntent("https://dropimg.io/foo")).toBe("");
    expect(normalizePageIntent("/temporary-image-hosting")).toBe("");
    expect(normalizePageIntent("custom-campaign")).toBe("");
    expect(normalizePageIntent(undefined)).toBe("");
  });
});
