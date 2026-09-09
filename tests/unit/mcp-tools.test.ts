import { describe, expect, it } from "vitest";
import { decodeImagePayload } from "../../src/lib/mcp-tools";

describe("decodeImagePayload", () => {
  it("accepts raw base64 and data URLs", () => {
    const raw = btoa("hi");
    expect(new TextDecoder().decode(decodeImagePayload(raw)!)).toBe("hi");
    expect(new TextDecoder().decode(decodeImagePayload(`data:image/png;base64,${raw}`)!)).toBe(
      "hi",
    );
    expect(decodeImagePayload("")).toBeNull();
    expect(decodeImagePayload("%%%")).toBeNull();
  });
});
