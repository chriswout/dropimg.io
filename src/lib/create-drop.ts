import { track } from "./analytics";
import {
  entitlementsFor,
  EXPIRY_1H,
  EXPIRY_24H,
  EXPIRY_30D,
  EXPIRY_7D,
  EXPIRY_90D,
  EXPIRY_180D,
  flagsFromEnv,
  r2ClassFor,
  resolveEntitlements,
  type Entitlements,
} from "./entitlements";
import type { ImagePasswordRecord } from "./image-password";
import { normalizePageIntent } from "./page-intent";
import {
  isProgrammaticSource,
  overProgrammaticDailyQuota,
  programmaticQuotaMessage,
} from "./programmatic-quota";
import { normalizeUploadClient } from "./upload-client";
import {
  overDailyQuota,
  storeUploadedImage,
  type StoreUploadFail,
  type StoreUploadOk,
} from "./upload-store";
import type { UploadErrorResponse, UploadResponse } from "../types";

const EXPIRY_LABELS: Record<string, number> = {
  "1h": EXPIRY_1H,
  "1hour": EXPIRY_1H,
  "1hours": EXPIRY_1H,
  "24h": EXPIRY_24H,
  "1d": EXPIRY_24H,
  "7d": EXPIRY_7D,
  "7day": EXPIRY_7D,
  "7days": EXPIRY_7D,
  "30d": EXPIRY_30D,
  "30day": EXPIRY_30D,
  "30days": EXPIRY_30D,
  "90d": EXPIRY_90D,
  "90day": EXPIRY_90D,
  "90days": EXPIRY_90D,
  "180d": EXPIRY_180D,
  "180day": EXPIRY_180D,
  "180days": EXPIRY_180D,
};

export type CreateDropInput = {
  userId: string | null;
  source: string;
  bytes: ArrayBuffer;
  expiry?: unknown;
  origin: string;
  ipHash: string;
  pageIntent?: string;
  password?: ImagePasswordRecord | null;
  maxBytesCap?: number;
};

export type CreateDropFail = {
  ok: false;
  status: 400 | 413 | 415 | 422 | 429 | 500 | 503;
  code: UploadErrorResponse["code"];
  error: string;
  reason?: string;
};

export type CreateDropOk = {
  ok: true;
  body: UploadResponse;
  entitlements: Entitlements;
};

/**
 * Shared write path: entitlements, expiry labels, burst + quota, then store.
 * Public/MCP layers map the camelCase UploadResponse themselves.
 */
export async function createDrop(
  env: Cloudflare.Env,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  input: CreateDropInput,
): Promise<CreateDropOk | CreateDropFail> {
  const source = normalizeUploadClient(input.source);
  const pageIntent = normalizePageIntent(input.pageIntent);
  const entitlements = input.userId
    ? await entitlementsFor(env, input.userId)
    : resolveEntitlements({
        userId: null,
        flags: flagsFromEnv(env),
      });

  const expirySeconds = parseExpiryInput(
    input.expiry,
    defaultExpiryForDrop(source, entitlements),
  );
  if (expirySeconds == null || !entitlements.allowedExpirySeconds.includes(expirySeconds)) {
    track(env.ANALYTICS, "upload_fail", {
      reason: "bad_expiry",
      client: source,
      pageIntent,
    });
    return {
      ok: false,
      status: 400,
      code: "invalid_expiry",
      error: "That expiry is not available.",
      reason: "bad_expiry",
    };
  }

  const limited = await applyUploadLimits(env, {
    ipHash: input.ipHash,
    userId: input.userId,
    source,
    pageIntent,
    plan: entitlements.plan,
  });
  if (!limited.ok) return limited;

  const maxBytes = Math.min(
    entitlements.maxUploadBytes,
    input.maxBytesCap ?? entitlements.maxUploadBytes,
  );

  const stored = await storeUploadedImage(env, ctx as ExecutionContext, {
    bytes: input.bytes,
    client: source,
    pageIntent,
    ipHash: input.ipHash,
    userId: input.userId,
    expirySeconds,
    maxBytes,
    origin: input.origin,
    r2Class: r2ClassFor(entitlements.plan, expirySeconds),
    password: input.password ?? null,
  });
  if (!stored.ok) return stored;

  if (input.password) {
    track(env.ANALYTICS, "password_protection_used", {
      client: source,
      plan: entitlements.plan,
      pageIntent,
    });
  }

  return { ok: true, body: stored.body, entitlements };
}

/** Free API/MCP defaults to 24h. Web/extension/ShareX keep the plan default. */
export function defaultExpiryForDrop(
  source: string,
  entitlements: Entitlements,
): number {
  if (
    isProgrammaticSource(source) &&
    entitlements.plan !== "pro" &&
    entitlements.allowedExpirySeconds.includes(EXPIRY_24H)
  ) {
    return EXPIRY_24H;
  }
  return entitlements.defaultExpirySeconds;
}

/**
 * Accept the friendly labels (`7d`) and raw seconds. The caller still has to
 * check the result against the plan allowlist.
 */
export function parseExpiryInput(
  raw: unknown,
  fallback: number,
): number | null {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw <= 0) return null;
    return raw;
  }
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return fallback;
  const labelled = EXPIRY_LABELS[value];
  if (labelled) return labelled;
  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && asNumber > 0) return asNumber;
  return null;
}

export function dropFailResponse(fail: CreateDropFail | StoreUploadFail): Response {
  const body: UploadErrorResponse = { error: fail.error, code: fail.code };
  return new Response(JSON.stringify(body), {
    status: fail.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function isCreateDropOk(
  result: CreateDropOk | CreateDropFail | StoreUploadOk | StoreUploadFail,
): result is CreateDropOk | StoreUploadOk {
  return result.ok;
}

async function applyUploadLimits(
  env: Cloudflare.Env,
  opts: {
    ipHash: string;
    userId: string | null;
    source: string;
    pageIntent: string;
    plan: Entitlements["plan"];
  },
): Promise<{ ok: true } | CreateDropFail> {
  const limiter = env.UPLOAD_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `upload:${opts.ipHash}` });
    if (!success) {
      track(env.ANALYTICS, "rate_limited", {
        reason: "burst",
        client: opts.source,
        pageIntent: opts.pageIntent,
      });
      return {
        ok: false,
        status: 429,
        code: "rate_limited",
        error: "Too many uploads. Try again shortly.",
        reason: "burst",
      };
    }
  }

  if (await overDailyQuota(env.DB, { ipHash: opts.ipHash, userId: opts.userId })) {
    track(env.ANALYTICS, "rate_limited", {
      reason: "daily_quota",
      client: opts.source,
      pageIntent: opts.pageIntent,
      plan: opts.plan,
    });
    return {
      ok: false,
      status: 429,
      code: "quota_exceeded",
      error: "Daily upload limit reached. Try again tomorrow.",
      reason: "daily_quota",
    };
  }

  if (isProgrammaticSource(opts.source) && opts.userId) {
    if (
      await overProgrammaticDailyQuota(env.DB, {
        userId: opts.userId,
        plan: opts.plan,
      })
    ) {
      track(env.ANALYTICS, "rate_limited", {
        reason: "programmatic_daily",
        client: opts.source,
        pageIntent: opts.pageIntent,
        plan: opts.plan,
      });
      return {
        ok: false,
        status: 429,
        code: "quota_exceeded",
        error: programmaticQuotaMessage(opts.plan),
        reason: "programmatic_daily",
      };
    }
  }

  return { ok: true };
}
