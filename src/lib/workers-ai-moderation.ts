/** Fixed-schema image classifier for Workers AI. Not antivirus. Not CSAM hashing. */

export const MODERATION_PROMPT_VERSION = "v3";
export const MODERATION_TIMEOUT_MS = 20_000;

export const MOONDREAM_MODEL = "@cf/moondream/moondream3.1-9B-A2B";
export const LLAMA_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
export const DEFAULT_MODERATION_MODEL = MOONDREAM_MODEL;

export const MODERATION_FLAGS = [
  "adult_nudity",
  "explicit_sexual_content",
  "graphic_violence",
  "weapons",
  "drugs",
  "hate_symbols",
  "self_harm",
] as const;

export type ModerationFlag = (typeof MODERATION_FLAGS)[number];

/** Visible guns, nudity, and drugs are telemetry only — too many game/art/plant FPs. */
export const MODERATION_BLOCK_FLAGS = [
  "explicit_sexual_content",
  "graphic_violence",
  "hate_symbols",
  "self_harm",
] as const satisfies readonly ModerationFlag[];

export type ModerationScores = Record<ModerationFlag, boolean> & {
  confidence: number;
};

export type ModerationAi = {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
};

export type ModerationDecision =
  | {
      outcome: "allow";
      scores: ModerationScores;
      model: string;
      promptVersion: string;
    }
  | {
      outcome: "block";
      scores: ModerationScores;
      model: string;
      promptVersion: string;
    }
  | {
      outcome: "unavailable";
      reason: "timeout" | "parse" | "error" | "missing_binding";
      model: string;
      promptVersion: string;
    };

export const MODERATION_PROMPT = `Classify this image for a temporary file host.
Reply with ONLY a JSON object. No markdown. No extra keys. No prose.
{
  "adult_nudity": boolean,
  "explicit_sexual_content": boolean,
  "graphic_violence": boolean,
  "weapons": boolean,
  "drugs": boolean,
  "hate_symbols": boolean,
  "self_harm": boolean,
  "confidence": number
}
Rules:
- confidence is 0 to 1.
- App/code/UI screenshots, documents, and memes without prohibited content: all flags false.
- Statues, paintings, drawings, and other art: adult_nudity false even if the figure is nude.
- Beach, swimwear, underwear, or a person wearing shorts: adult_nudity false, explicit_sexual_content false.
- explicit_sexual_content: sexual acts or pornography, not mere nudity or art.
- Clinical medical imagery: all flags false. A syringe or pills in a medical context is not drugs.
- A cannabis or other plant growing: drugs false.
- drugs: packaged illicit drugs or someone using them, not plants or medicine.
- Cartoons: flag only if they clearly show a prohibited category.
- graphic_violence: real-world injury, blood, gore, combat, corpses, or assault. Not Halloween makeup, red paint, or clinical surgery.
- weapons: a real-world firearm or melee weapon as the subject. Game screenshots, first-person game views with a rendered gun and crosshair, HUD, sprites, toys, and museum pieces: weapons false.
- Video game footage and 3D rendered characters: graphic_violence false and weapons false.
- Set a flag true only when that category is clearly present.`;

export function bytesToDataUri(bytes: ArrayBuffer, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export function parseModerationJson(raw: string): ModerationScores | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  const scores = {} as ModerationScores;
  for (const flag of MODERATION_FLAGS) {
    if (typeof row[flag] !== "boolean") return null;
    scores[flag] = row[flag];
  }
  // Moondream always returns confidence: 0. Treat it as telemetry only.
  scores.confidence =
    typeof row.confidence === "number" && Number.isFinite(row.confidence)
      ? row.confidence
      : 0;
  return scores;
}

export function decideModeration(
  scores: ModerationScores,
  model: string,
): Extract<ModerationDecision, { outcome: "allow" | "block" }> {
  const blocked = MODERATION_BLOCK_FLAGS.some((flag) => scores[flag]);
  return {
    outcome: blocked ? "block" : "allow",
    scores,
    model,
    promptVersion: MODERATION_PROMPT_VERSION,
  };
}

export function trueModerationFlags(scores: ModerationScores): ModerationFlag[] {
  return MODERATION_FLAGS.filter((flag) => scores[flag]);
}

export function extractModelText(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const row = result as Record<string, unknown>;
  if (typeof row.answer === "string") return row.answer;
  if (typeof row.response === "string") return row.response;
  if (typeof row.result === "string") return row.result;
  if (row.result && typeof row.result === "object") {
    return extractModelText(row.result);
  }
  return "";
}

export function runInputsForModel(
  model: string,
  image: string,
): Record<string, unknown> {
  if (model === MOONDREAM_MODEL) {
    return {
      task: "query",
      image,
      question: MODERATION_PROMPT,
      reasoning: false,
      stream: false,
      temperature: 0,
      max_tokens: 256,
    };
  }
  return {
    messages: [
      {
        role: "system",
        content: "Return only the requested JSON object.",
      },
      { role: "user", content: MODERATION_PROMPT },
    ],
    image,
    stream: false,
    temperature: 0,
    max_tokens: 256,
  };
}

export async function classifyImage(
  ai: ModerationAi | undefined,
  opts: {
    bytes: ArrayBuffer;
    mime: string;
    model?: string;
    timeoutMs?: number;
  },
): Promise<ModerationDecision> {
  const model = opts.model || DEFAULT_MODERATION_MODEL;
  if (!ai) {
    return {
      outcome: "unavailable",
      reason: "missing_binding",
      model,
      promptVersion: MODERATION_PROMPT_VERSION,
    };
  }

  try {
    const result = await withTimeout(
      ai.run(model, runInputsForModel(model, bytesToDataUri(opts.bytes, opts.mime))),
      opts.timeoutMs ?? MODERATION_TIMEOUT_MS,
    );
    const scores = parseModerationJson(extractModelText(result));
    if (!scores) {
      return {
        outcome: "unavailable",
        reason: "parse",
        model,
        promptVersion: MODERATION_PROMPT_VERSION,
      };
    }
    return decideModeration(scores, model);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      outcome: "unavailable",
      reason: message === "moderation_timeout" ? "timeout" : "error",
      model,
      promptVersion: MODERATION_PROMPT_VERSION,
    };
  }
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  if (body.startsWith("{") && body.endsWith("}")) return body;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return body.slice(start, end + 1);
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("moderation_timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
