/** Server-authoritative plan limits. Frontend claims are never trusted. */

import type { R2KeyClass } from "./tokens";

export const FREE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PRO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const EXPIRY_1H = 60 * 60;
export const EXPIRY_24H = 24 * 60 * 60;
export const EXPIRY_7D = 7 * 24 * 60 * 60;
export const EXPIRY_30D = 30 * 24 * 60 * 60;
export const EXPIRY_90D = 90 * 24 * 60 * 60;

/**
 * Hard ceiling on a single image's life, measured from its ORIGINAL upload.
 * Repeated extends can approach this but never pass it.
 */
export const MAX_LIFETIME_SECONDS = EXPIRY_90D;

/** Pre-V2 behaviour: one fixed lifetime for everyone. */
export const LEGACY_EXPIRY_CHOICES = [EXPIRY_24H];
export const FREE_EXPIRY_CHOICES = [EXPIRY_1H, EXPIRY_24H, EXPIRY_7D];
export const PRO_EXPIRY_CHOICES = [
  EXPIRY_1H,
  EXPIRY_24H,
  EXPIRY_7D,
  EXPIRY_30D,
  EXPIRY_90D,
];

export const FREE_HISTORY_LIMIT = 10;
export const PRO_HISTORY_PAGE = 50;

export type Plan = "anonymous" | "free" | "pro";

export type Entitlements = {
  plan: Plan;
  maxUploadBytes: number;
  allowedExpirySeconds: number[];
  /** What a client should preselect, and what the server assumes when asked for nothing. */
  defaultExpirySeconds: number;
  passwordProtection: boolean;
  /** Active cloud history cap; null = paginated full history. */
  historyLimit: number | null;
  adFree: boolean;
};

export type SubscriptionSnapshot = {
  status: string;
  price_id?: string | null;
  current_period_end: number | null;
  cancel_at_period_end: number | boolean;
};

export type EntitlementFlags = {
  /**
   * The whole choose-your-own-lifetime feature, for every plan, behind one
   * switch. Off, every plan gets the single legacy 24h lifetime, which is what
   * production still runs and what the current R2 lifecycle rules cover. On,
   * Free gets 1h/24h/7d and Pro additionally gets 30d/90d — the two sets are
   * released together because they depend on the same `o/7d` and `o/pro`
   * lifecycle rules being in place on the bucket.
   */
  longTtl: boolean;
  /** 50 MB only after strip + staging OOM gate. */
  pro50mb: boolean;
};

export const DEFAULT_FLAGS: EntitlementFlags = {
  longTtl: false,
  pro50mb: false,
};

export function flagsFromEnv(env: {
  LONG_TTL_ENABLED?: string;
  PRO_50MB_ENABLED?: string;
}): EntitlementFlags {
  return {
    longTtl: env.LONG_TTL_ENABLED === "true",
    pro50mb: env.PRO_50MB_ENABLED === "true",
  };
}

/**
 * Pro while the paid period is still running:
 * active, trialing, past_due, or canceled/paused with current_period_end in
 * the future. `unpaid` is deliberately absent: it is where Stripe parks a
 * subscription after retries are exhausted, so access should already be gone.
 */
export function isProSubscription(
  sub: SubscriptionSnapshot | null | undefined,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!sub) return false;
  const end = sub.current_period_end;
  if (end != null && end <= now) return false;

  const status = sub.status.trim().toLowerCase();
  if (status === "active" || status === "trialing" || status === "past_due") {
    return true;
  }
  if (status === "canceled" || status === "paused") {
    return end != null && end > now;
  }
  return false;
}

/** 7 days is the product default wherever the plan can actually reach it. */
export function defaultExpiryOf(allowed: readonly number[]): number {
  return allowed.includes(EXPIRY_7D) ? EXPIRY_7D : EXPIRY_24H;
}

export function resolveEntitlements(input: {
  userId: string | null;
  subscription?: SubscriptionSnapshot | null;
  now?: number;
  flags?: EntitlementFlags;
}): Entitlements {
  const flags = input.flags ?? DEFAULT_FLAGS;
  const freeChoices = flags.longTtl ? FREE_EXPIRY_CHOICES : LEGACY_EXPIRY_CHOICES;

  if (!input.userId) {
    return {
      plan: "anonymous",
      maxUploadBytes: FREE_MAX_UPLOAD_BYTES,
      allowedExpirySeconds: [...freeChoices],
      defaultExpirySeconds: defaultExpiryOf(freeChoices),
      passwordProtection: false,
      historyLimit: 0,
      adFree: false,
    };
  }

  const pro = isProSubscription(input.subscription, input.now);
  if (!pro) {
    return {
      plan: "free",
      maxUploadBytes: FREE_MAX_UPLOAD_BYTES,
      allowedExpirySeconds: [...freeChoices],
      defaultExpirySeconds: defaultExpiryOf(freeChoices),
      passwordProtection: false,
      historyLimit: FREE_HISTORY_LIMIT,
      adFree: false,
    };
  }

  const proChoices = flags.longTtl ? PRO_EXPIRY_CHOICES : LEGACY_EXPIRY_CHOICES;
  return {
    plan: "pro",
    maxUploadBytes: flags.pro50mb
      ? PRO_MAX_UPLOAD_BYTES
      : FREE_MAX_UPLOAD_BYTES,
    allowedExpirySeconds: [...proChoices],
    defaultExpirySeconds: defaultExpiryOf(proChoices),
    passwordProtection: true,
    historyLimit: null,
    adFree: true,
  };
}

/**
 * Which R2 lifecycle class an upload belongs in.
 *
 * Pro objects always land in `o/pro` no matter how short the chosen lifetime,
 * because the owner can extend them later and moving an object is far more
 * expensive than parking it under the long-lived safety rule from the start.
 */
export function r2ClassFor(plan: Plan, expirySeconds: number): R2KeyClass {
  if (plan === "pro") return "pro";
  return expirySeconds > EXPIRY_24H ? "7d" : "24h";
}

export const EXPIRY_HEADER = "x-dropimg-expiry";

/**
 * Anonymous uploads keep their raw-body shape, so a header is the only place an
 * expiry can ride along. The plan's own allowlist is the validator, so a client
 * can never widen its lifetime by asking nicely.
 */
export function parseExpiryHeader(
  raw: string | null | undefined,
  entitlements: Entitlements,
): { ok: true; expirySeconds: number } | { ok: false } {
  if (raw == null || raw.trim() === "") {
    return { ok: true, expirySeconds: entitlements.defaultExpirySeconds };
  }
  const value = Number(raw.trim());
  if (!Number.isInteger(value)) return { ok: false };
  if (!entitlements.allowedExpirySeconds.includes(value)) return { ok: false };
  return { ok: true, expirySeconds: value };
}

export function uploadIntentAllowed(
  intent: {
    expiry_seconds: number;
    max_bytes: number;
    hasPassword: boolean;
  },
  entitlements: Entitlements,
): boolean {
  if (!entitlements.allowedExpirySeconds.includes(intent.expiry_seconds)) {
    return false;
  }
  if (intent.hasPassword && !entitlements.passwordProtection) {
    return false;
  }
  if (intent.max_bytes > entitlements.maxUploadBytes) {
    return false;
  }
  return true;
}

export async function entitlementsFor(
  env: Cloudflare.Env,
  userId: string,
): Promise<Entitlements> {
  const flags = flagsFromEnv(env);
  const subscription = await loadSubscription(env.DB, userId);
  return resolveEntitlements({ userId, subscription, flags });
}

export async function loadSubscription(
  db: D1Database,
  userId: string,
): Promise<SubscriptionSnapshot | null> {
  const row = await db
    .prepare(
      `SELECT status, price_id, current_period_end, cancel_at_period_end
       FROM subscriptions
       WHERE user_id = ? AND provider = 'stripe'
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first<SubscriptionSnapshot>();
  return row ?? null;
}
