/** Server-authoritative plan limits. Frontend claims are never trusted. */

export const FREE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PRO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const EXPIRY_24H = 24 * 60 * 60;
export const EXPIRY_7D = 7 * 24 * 60 * 60;
export const EXPIRY_30D = 30 * 24 * 60 * 60;
export const FREE_HISTORY_LIMIT = 10;
export const PRO_HISTORY_PAGE = 50;

export type Plan = "anonymous" | "free" | "pro";

export type Entitlements = {
  plan: Plan;
  maxUploadBytes: number;
  allowedExpirySeconds: number[];
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
  /** 7d/30d only after dual R2 lifecycle is proven. */
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
 * active, past_due, or canceled/paused with current_period_end in the future.
 */
export function isProSubscription(
  sub: SubscriptionSnapshot | null | undefined,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!sub) return false;
  const end = sub.current_period_end;
  if (end != null && end <= now) return false;

  const status = sub.status.trim().toLowerCase();
  if (status === "active" || status === "past_due") return true;
  if (status === "canceled" || status === "paused") {
    return end != null && end > now;
  }
  return false;
}

export function resolveEntitlements(input: {
  userId: string | null;
  subscription?: SubscriptionSnapshot | null;
  now?: number;
  flags?: EntitlementFlags;
}): Entitlements {
  const flags = input.flags ?? DEFAULT_FLAGS;
  if (!input.userId) {
    return {
      plan: "anonymous",
      maxUploadBytes: FREE_MAX_UPLOAD_BYTES,
      allowedExpirySeconds: [EXPIRY_24H],
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
      allowedExpirySeconds: [EXPIRY_24H],
      passwordProtection: false,
      historyLimit: FREE_HISTORY_LIMIT,
      adFree: false,
    };
  }

  return {
    plan: "pro",
    maxUploadBytes: flags.pro50mb
      ? PRO_MAX_UPLOAD_BYTES
      : FREE_MAX_UPLOAD_BYTES,
    allowedExpirySeconds: flags.longTtl
      ? [EXPIRY_24H, EXPIRY_7D, EXPIRY_30D]
      : [EXPIRY_24H],
    passwordProtection: true,
    historyLimit: null,
    adFree: true,
  };
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
       WHERE user_id = ? AND provider = 'paddle'
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first<SubscriptionSnapshot>();
  return row ?? null;
}
