import { describe, expect, it } from "vitest";
import {
  moderationEnabled,
  moderationEnforced,
  runPostStripSafetyScan,
} from "../../src/lib/moderation-hook";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer;

const safe = JSON.stringify({
  adult_nudity: false,
  explicit_sexual_content: false,
  graphic_violence: false,
  weapons: false,
  drugs: false,
  hate_symbols: false,
  self_harm: false,
  confidence: 0.99,
});

describe("moderation hook", () => {
  it("is a no-op while the flag is off", async () => {
    expect(moderationEnabled({})).toBe(false);
    expect(moderationEnforced({})).toBe(false);
    const result = await runPostStripSafetyScan(
      {
        MODERATION_ENABLED: "false",
        AI: {
          async run() {
            throw new Error("should not run");
          },
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(result).toEqual({ ok: true });
  });

  it("publishes SAFE scores when enabled", async () => {
    const result = await runPostStripSafetyScan(
      {
        MODERATION_ENABLED: "true",
        AI: {
          async run() {
            return { answer: safe };
          },
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects blocked or unavailable results only when enforced", async () => {
    const blocked = await runPostStripSafetyScan(
      {
        MODERATION_ENABLED: "true",
        MODERATION_ENFORCE: "true",
        AI: {
          async run() {
            return {
              answer: JSON.stringify({
                adult_nudity: false,
                explicit_sexual_content: true,
                graphic_violence: false,
                weapons: false,
                drugs: false,
                hate_symbols: false,
                self_harm: false,
                confidence: 0.99,
              }),
            };
          },
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(blocked).toEqual({ ok: false, reason: "moderation_block" });

    const missing = await runPostStripSafetyScan(
      { MODERATION_ENABLED: "true", MODERATION_ENFORCE: "true" },
      { bytes: png, mime: "image/png" },
    );
    expect(missing).toEqual({ ok: false, reason: "moderation_unavailable" });
  });

  it("shadow mode classifies but still publishes", async () => {
    const writes: string[] = [];
    const blocked = await runPostStripSafetyScan(
      {
        MODERATION_ENABLED: "true",
        MODERATION_ENFORCE: "false",
        ANALYTICS: {
          writeDataPoint(point) {
            writes.push(String(point.indexes?.[0]));
          },
        } as AnalyticsEngineDataset,
        AI: {
          async run() {
            return {
              answer: JSON.stringify({
                adult_nudity: false,
                explicit_sexual_content: true,
                graphic_violence: false,
                weapons: true,
                drugs: false,
                hate_symbols: false,
                self_harm: false,
                confidence: 0,
              }),
            };
          },
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(blocked).toEqual({ ok: true });
    expect(writes).toContain("moderation_decision");
    expect(writes).toContain("moderation_flag");

    const missing = await runPostStripSafetyScan(
      { MODERATION_ENABLED: "true", MODERATION_ENFORCE: "false" },
      { bytes: png, mime: "image/png" },
    );
    expect(missing).toEqual({ ok: true });
  });

  it("allows weapons, adult_nudity, or drugs telemetry flags", async () => {
    const result = await runPostStripSafetyScan(
      {
        MODERATION_ENABLED: "true",
        MODERATION_ENFORCE: "true",
        AI: {
          async run() {
            return {
              answer: JSON.stringify({
                adult_nudity: true,
                explicit_sexual_content: false,
                graphic_violence: false,
                weapons: true,
                drugs: true,
                hate_symbols: false,
                self_harm: false,
                confidence: 0,
              }),
            };
          },
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(result).toEqual({ ok: true });
  });
});
