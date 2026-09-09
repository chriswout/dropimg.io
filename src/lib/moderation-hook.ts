import { track } from "./analytics";
import {
  classifyImage,
  DEFAULT_MODERATION_MODEL,
  trueModerationFlags,
  type ModerationAi,
  type ModerationDecision,
} from "./workers-ai-moderation";

export function moderationEnabled(env: { MODERATION_ENABLED?: string }): boolean {
  return env.MODERATION_ENABLED === "true";
}

/** Classify but do not reject until this is true. */
export function moderationEnforced(env: { MODERATION_ENFORCE?: string }): boolean {
  return env.MODERATION_ENFORCE === "true";
}

/**
 * After metadata strip. Off by default.
 * Shadow (`ENABLED` without `ENFORCE`): classify, log, always publish.
 * Enforce: hard flag → 422, unavailable → 503, nothing stored.
 */
export async function runPostStripSafetyScan(
  env: {
    AI?: ModerationAi;
    ANALYTICS?: AnalyticsEngineDataset;
    MODERATION_ENABLED?: string;
    MODERATION_ENFORCE?: string;
    MODERATION_MODEL?: string;
  },
  opts: {
    bytes: ArrayBuffer;
    mime: string;
    slug?: string;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!moderationEnabled(env)) return { ok: true };

  const enforce = moderationEnforced(env);
  const decision = await classifyImage(env.AI, {
    bytes: opts.bytes,
    mime: opts.mime,
    model: env.MODERATION_MODEL || DEFAULT_MODERATION_MODEL,
  });
  recordModeration(env.ANALYTICS, decision, enforce);

  if (!enforce) return { ok: true };
  if (decision.outcome === "allow") return { ok: true };
  if (decision.outcome === "block") return { ok: false, reason: "moderation_block" };
  return { ok: false, reason: "moderation_unavailable" };
}

function recordModeration(
  analytics: AnalyticsEngineDataset | undefined,
  decision: ModerationDecision,
  enforce: boolean,
): void {
  const mode = enforce ? "enforce" : "shadow";
  if (decision.outcome === "unavailable") {
    track(analytics, "moderation_decision", {
      reason: `unavailable:${decision.reason}:${mode}`,
    });
    return;
  }
  const flags = trueModerationFlags(decision.scores);
  const wouldBlock = decision.outcome === "block";
  track(analytics, "moderation_decision", {
    reason: `${wouldBlock ? "would_block" : "allow"}:${mode}`,
  });
  for (const flag of flags) {
    track(analytics, "moderation_flag", { reason: `${flag}:${mode}` });
  }
}
