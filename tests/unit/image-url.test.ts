import { describe, expect, it } from "vitest";
import {
  directImagePath,
  directImageUrl,
  extensionMatchesMime,
  parseDirectImageFilename,
} from "../../src/lib/image-url";

describe("direct image URLs", () => {
  it("adds the canonical extension for each supported image type", () => {
    expect(directImagePath("Ab3xYz91", "image/png")).toBe("/Ab3xYz91.png");
    expect(directImageUrl("https://dropimg.io/", "Ab3xYz91", "image/jpeg")).toBe(
      "https://dropimg.io/Ab3xYz91.jpg",
    );
  });

  it("parses valid direct filenames without weakening slug validation", () => {
    expect(parseDirectImageFilename("Ab3xYz91.webp")).toEqual({
      slug: "Ab3xYz91",
      ext: "webp",
    });
    expect(parseDirectImageFilename("Ab3xYz91.exe")).toBeNull();
    expect(parseDirectImageFilename("0b3xYz91.png")).toBeNull();
    expect(parseDirectImageFilename("privacy.png")).toBeNull();
  });

  it("rejects an extension that does not match the stored MIME", () => {
    expect(extensionMatchesMime("png", "image/png")).toBe(true);
    expect(extensionMatchesMime("jpeg", "image/jpeg")).toBe(true);
    expect(extensionMatchesMime("gif", "image/png")).toBe(false);
  });
});
