import { describe, expect, it } from "vitest";
import {
  classifyImage,
  decideModeration,
  DEFAULT_MODERATION_MODEL,
  extractModelText,
  LLAMA_VISION_MODEL,
  MODERATION_TIMEOUT_MS,
  MOONDREAM_MODEL,
  parseModerationJson,
  runInputsForModel,
  type ModerationScores,
} from "../../src/lib/workers-ai-moderation";

const safe: ModerationScores = {
  adult_nudity: false,
  explicit_sexual_content: false,
  graphic_violence: false,
  weapons: false,
  drugs: false,
  hate_symbols: false,
  self_harm: false,
  confidence: 0.98,
};

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer;

describe("parseModerationJson", () => {
  it("accepts a strict object and rejects missing flags", () => {
    expect(parseModerationJson(JSON.stringify(safe))).toEqual(safe);
    expect(parseModerationJson("```json\n" + JSON.stringify(safe) + "\n```")).toEqual(
      safe,
    );
    expect(parseModerationJson("Sure. " + JSON.stringify(safe))).toEqual(safe);
    expect(parseModerationJson('{"adult_nudity":false}')).toBeNull();
    expect(parseModerationJson("not json")).toBeNull();
    const { confidence: _ignored, ...flagsOnly } = safe;
    expect(parseModerationJson(JSON.stringify(flagsOnly))).toEqual({
      ...safe,
      confidence: 0,
    });
  });
});

describe("decideModeration", () => {
  it("blocks hard flags only, not weapons, adult_nudity, or drugs", () => {
    expect(decideModeration(safe, "m").outcome).toBe("allow");
    expect(decideModeration({ ...safe, confidence: 0 }, "m").outcome).toBe("allow");
    expect(decideModeration({ ...safe, adult_nudity: true }, "m").outcome).toBe("allow");
    expect(decideModeration({ ...safe, drugs: true }, "m").outcome).toBe("allow");
    expect(decideModeration({ ...safe, weapons: true }, "m").outcome).toBe("allow");
    expect(decideModeration({ ...safe, explicit_sexual_content: true }, "m").outcome).toBe(
      "block",
    );
    expect(decideModeration({ ...safe, graphic_violence: true }, "m").outcome).toBe("block");
    expect(MODERATION_TIMEOUT_MS).toBe(20_000);
  });
});

describe("extractModelText", () => {
  it("reads Moondream and Llama envelopes", () => {
    expect(extractModelText({ answer: JSON.stringify(safe) })).toContain("confidence");
    expect(extractModelText({ response: "ok" })).toBe("ok");
    expect(extractModelText({ result: { answer: "nested" } })).toBe("nested");
  });
});

describe("runInputsForModel", () => {
  it("disables Moondream reasoning and uses chat for Llama", () => {
    const moon = runInputsForModel(MOONDREAM_MODEL, "data:image/png;base64,xx");
    expect(moon.task).toBe("query");
    expect(moon.reasoning).toBe(false);
    expect(moon.stream).toBe(false);
    const llama = runInputsForModel(LLAMA_VISION_MODEL, "data:image/png;base64,xx");
    expect(llama.messages).toBeTruthy();
  });
});

describe("classifyImage", () => {
  it("allows a valid SAFE model response", async () => {
    const decision = await classifyImage(
      {
        async run() {
          return { answer: JSON.stringify(safe) };
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.model).toBe(DEFAULT_MODERATION_MODEL);
    }
  });

  it("blocks a prohibited flag", async () => {
    const decision = await classifyImage(
      {
        async run() {
          return { answer: JSON.stringify({ ...safe, graphic_violence: true }) };
        },
      },
      { bytes: png, mime: "image/png" },
    );
    expect(decision.outcome).toBe("block");
  });

  it("fails closed on parse, timeout, and missing binding", async () => {
    expect(
      (
        await classifyImage(
          {
            async run() {
              return { answer: "I cannot help with that." };
            },
          },
          { bytes: png, mime: "image/png" },
        )
      ).outcome,
    ).toBe("unavailable");

    const timed = await classifyImage(
      {
        async run() {
          return new Promise(() => {});
        },
      },
      { bytes: png, mime: "image/png", timeoutMs: 20 },
    );
    expect(timed.outcome).toBe("unavailable");
    if (timed.outcome === "unavailable") expect(timed.reason).toBe("timeout");

    const missing = await classifyImage(undefined, {
      bytes: png,
      mime: "image/png",
    });
    expect(missing.outcome).toBe("unavailable");
    if (missing.outcome === "unavailable") expect(missing.reason).toBe("missing_binding");
  });
});
