import { describe, expect, it } from "vitest";
import { mapModerationFail } from "../../src/lib/upload-store";

describe("mapModerationFail", () => {
  it("maps a hard block to 422", () => {
    expect(mapModerationFail("moderation_block")).toEqual({
      status: 422,
      code: "moderation_block",
      error: "Image rejected",
    });
  });

  it("maps timeout or outage to retryable 503", () => {
    expect(mapModerationFail("moderation_unavailable")).toEqual({
      status: 503,
      code: "moderation_unavailable",
      error: "Could not check this image. Try again.",
    });
  });
});
