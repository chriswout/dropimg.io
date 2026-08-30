import type { Context } from "hono";
import { track } from "./analytics";
import { toArrayBuffer } from "./d1-blob";
import {
  entitlementsFor,
  EXPIRY_1H,
  EXPIRY_24H,
  EXPIRY_30D,
  EXPIRY_7D,
  EXPIRY_90D,
  r2ClassFor,
  uploadIntentAllowed,
  type Entitlements,
} from "./entitlements";
import {
  hashImagePassword,
  isStoredScryptV1,
  PASSWORD_KDF,
  PASSWORD_MIN_LENGTH,
  type ImagePasswordRecord,
} from "./image-password";
import { clientIp, hashIp } from "./ip";
import { normalizePageIntent } from "./page-intent";
import { resolveIpHashSecret } from "./secrets";
import { uuid } from "./tokens";
import { normalizeUploadClient } from "./upload-client";
import {
  overDailyQuota,
  storeUploadedImage,
  uploadFailResponse,
} from "./upload-store";

export const INTENT_TTL_SECONDS = 10 * 60;

type Env = { Bindings: Cloudflare.Env };

export type CreateOwnedIntentOk = {
  ok: true;
  id: string;
  maxBytes: number;
  expirySeconds: number;
};

export type CreateOwnedIntentFail = {
  ok: false;
  status: 400 | 500;
  error: string;
  detail?: string;
};

export async function createOwnedUploadIntent(
  env: Cloudflare.Env,
  userId: string,
  input: { expiry?: number; password?: string },
): Promise<CreateOwnedIntentOk | CreateOwnedIntentFail> {
  const entitlements = await entitlementsFor(env, userId);
  let expiry = entitlements.defaultExpirySeconds;
  if (input.expiry != null) expiry = Number(input.expiry);
  if (!entitlements.allowedExpirySeconds.includes(expiry)) {
    return { ok: false, status: 400, error: "That expiry is not available." };
  }

  let password: string | null = null;
  if (typeof input.password === "string" && input.password.length > 0) {
    password = input.password;
  }
  if (password) {
    if (!entitlements.passwordProtection) {
      return { ok: false, status: 400, error: "Password protection is not available." };
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return { ok: false, status: 400, error: "Password must be at least 8 characters." };
    }
  }

  let hashed: ImagePasswordRecord | null = null;
  if (password) {
    try {
      hashed = await hashImagePassword(password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "hash_failed";
      console.error("password_intent_hash_failed", msg);
      return {
        ok: false,
        status: 500,
        error: "Could not save password.",
        detail: env.ENVIRONMENT === "production" ? undefined : msg,
      };
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const id = uuid();
  await env.DB.prepare(
    `INSERT INTO upload_intents
      (id, user_id, expiry_seconds, max_bytes, created_at, expires_at,
       password_hash, password_salt, password_kdf, password_iterations,
       password_cost, password_block_size, password_parallelization)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      expiry,
      entitlements.maxUploadBytes,
      now,
      now + INTENT_TTL_SECONDS,
      hashed
        ? hashed.hash.buffer.slice(
            hashed.hash.byteOffset,
            hashed.hash.byteOffset + hashed.hash.byteLength,
          )
        : null,
      hashed
        ? hashed.salt.buffer.slice(
            hashed.salt.byteOffset,
            hashed.salt.byteOffset + hashed.salt.byteLength,
          )
        : null,
      hashed?.kdf ?? null,
      null,
      hashed?.cost ?? null,
      hashed?.blockSize ?? null,
      hashed?.parallelization ?? null,
    )
    .run();

  return {
    ok: true,
    id,
    maxBytes: entitlements.maxUploadBytes,
    expirySeconds: expiry,
  };
}

export async function executeOwnedUploadFromRequest(
  c: Context<Env>,
  userId: string,
  intentId: string,
): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);
  const intent = await c.env.DB.prepare(
    `SELECT expiry_seconds, max_bytes, password_hash, password_salt, password_kdf,
            password_cost, password_block_size, password_parallelization
     FROM upload_intents
     WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(intentId, userId, now)
    .first<{
      expiry_seconds: number;
      max_bytes: number;
      password_hash: unknown;
      password_salt: unknown;
      password_kdf: string | null;
      password_cost: number | null;
      password_block_size: number | null;
      password_parallelization: number | null;
    }>();
  if (!intent) {
    return c.json({ error: "Upload intent is invalid or expired." }, 400);
  }

  const entitlements = await entitlementsFor(c.env, userId);
  const hasPassword = Boolean(intent.password_hash && intent.password_salt);
  if (
    !uploadIntentAllowed(
      {
        expiry_seconds: intent.expiry_seconds,
        max_bytes: intent.max_bytes,
        hasPassword,
      },
      entitlements,
    )
  ) {
    await c.env.DB.prepare(
      `UPDATE upload_intents SET used_at = ?
       WHERE id = ? AND user_id = ? AND used_at IS NULL`,
    )
      .bind(now, intentId, userId)
      .run();
    return c.json(
      { error: "This upload is no longer available. Create a new upload." },
      400,
    );
  }

  const used = await c.env.DB.prepare(
    `UPDATE upload_intents SET used_at = ?
     WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(now, intentId, userId, now)
    .run();
  if (!used.meta.changes) {
    return c.json({ error: "Upload intent is invalid or expired." }, 400);
  }

  const client = normalizeUploadClient(c.req.header("x-dropimg-client"));
  const pageIntent = normalizePageIntent(c.req.header("x-dropimg-page-intent"));
  const contentLength = Number(c.req.header("content-length") || 0);
  const maxBytes = Math.min(intent.max_bytes, entitlements.maxUploadBytes);
  if (contentLength > maxBytes) {
    return c.json({ error: "File exceeds the size limit", code: "too_large" }, 413);
  }

  const prepared = await prepareOwnedUploadLimits(c, userId, client, pageIntent);
  if (!prepared.ok) return prepared.response;

  let bytes: ArrayBuffer;
  try {
    bytes = await c.req.arrayBuffer();
  } catch {
    return c.json({ error: "Could not read upload body", code: "invalid_image" }, 400);
  }

  const passHash = toArrayBuffer(intent.password_hash);
  const passSalt = toArrayBuffer(intent.password_salt);
  if (passHash && passSalt && !isStoredScryptV1(intent)) {
    return c.json(
      { error: "This upload is no longer available. Create a new upload." },
      400,
    );
  }

  return storeOwnedBytes(c, {
    userId,
    entitlements,
    bytes,
    maxBytes,
    expirySeconds: intent.expiry_seconds,
    client,
    pageIntent,
    ipHash: prepared.ipHash,
    password: passwordFromIntent(intent),
  });
}

export const SHAREX_MULTIPART_MAX_BYTES = 10 * 1024 * 1024;

const SHAREX_EXPIRY_LABELS: Record<string, number> = {
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
};

/**
 * ShareX sends expiry as a free-text form field, so accept the friendly labels
 * as well as raw seconds. Whatever comes back is still checked against the
 * caller's entitlements before it is stored.
 */
export function parseSharexExpiry(
  raw: unknown,
  fallback: number = EXPIRY_7D,
): number | null {
  if (raw == null || raw === "") return fallback;
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  const labelled = SHAREX_EXPIRY_LABELS[value];
  if (labelled) return labelled;
  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && asNumber > 0) return asNumber;
  return null;
}

export async function executeOwnedDirectUpload(
  c: Context<Env>,
  input: {
    userId: string;
    bytes: ArrayBuffer;
    /** null asks for the plan default rather than a specific lifetime. */
    expirySeconds: number | null;
    maxBytesCap: number;
    client: string;
    pageIntent?: string;
  },
): Promise<Response> {
  const entitlements = await entitlementsFor(c.env, input.userId);
  const expirySeconds = input.expirySeconds ?? entitlements.defaultExpirySeconds;
  if (!entitlements.allowedExpirySeconds.includes(expirySeconds)) {
    return c.json({ error: "That expiry is not available." }, 400);
  }
  const maxBytes = Math.min(
    entitlements.maxUploadBytes,
    input.maxBytesCap,
    entitlements.maxUploadBytes,
  );
  const prepared = await prepareOwnedUploadLimits(
    c,
    input.userId,
    input.client,
    input.pageIntent ?? "",
  );
  if (!prepared.ok) return prepared.response;

  return storeOwnedBytes(c, {
    userId: input.userId,
    entitlements,
    bytes: input.bytes,
    maxBytes,
    expirySeconds,
    client: input.client,
    pageIntent: input.pageIntent ?? "",
    ipHash: prepared.ipHash,
    password: null,
  });
}

async function prepareOwnedUploadLimits(
  c: Context<Env>,
  userId: string,
  client: string,
  pageIntent: string,
): Promise<{ ok: true; ipHash: string } | { ok: false; response: Response }> {
  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) {
    return {
      ok: false,
      response: c.json(
        { error: "Upload temporarily unavailable", code: "server_error" },
        500,
      ),
    };
  }
  const ip = clientIp(c.req.raw);
  const ipHash = await hashIp(ip, secretResolved.secret);

  const limiter = c.env.UPLOAD_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `upload:${ipHash}` });
    if (!success) {
      track(c.env.ANALYTICS, "rate_limited", { reason: "burst", client, pageIntent });
      return {
        ok: false,
        response: c.json(
          { error: "Too many uploads. Try again shortly.", code: "rate_limited" },
          429,
        ),
      };
    }
  }

  if (await overDailyQuota(c.env.DB, { ipHash, userId })) {
    track(c.env.ANALYTICS, "rate_limited", { reason: "daily_quota", client, pageIntent });
    return {
      ok: false,
      response: c.json(
        { error: "Daily upload limit reached. Try again tomorrow.", code: "quota_exceeded" },
        429,
      ),
    };
  }

  return { ok: true, ipHash };
}

async function storeOwnedBytes(
  c: Context<Env>,
  input: {
    userId: string;
    entitlements: Entitlements;
    bytes: ArrayBuffer;
    maxBytes: number;
    expirySeconds: number;
    client: string;
    pageIntent: string;
    ipHash: string;
    password: ImagePasswordRecord | null;
  },
): Promise<Response> {
  const stored = await storeUploadedImage(c.env, c.executionCtx, {
    bytes: input.bytes,
    client: input.client,
    pageIntent: input.pageIntent,
    ipHash: input.ipHash,
    userId: input.userId,
    expirySeconds: input.expirySeconds,
    maxBytes: input.maxBytes,
    origin: new URL(c.req.url).origin,
    r2Class: r2ClassFor(input.entitlements.plan, input.expirySeconds),
    password: input.password,
  });
  if (!stored.ok) return uploadFailResponse(stored);
  if (input.password) {
    track(c.env.ANALYTICS, "password_protection_used", {
      client: input.client,
      plan: input.entitlements.plan,
      pageIntent: input.pageIntent,
    });
  }
  return c.json(stored.body, 201);
}

function passwordFromIntent(intent: {
  password_hash: unknown;
  password_salt: unknown;
  password_kdf: string | null;
  password_cost: number | null;
  password_block_size: number | null;
  password_parallelization: number | null;
}): ImagePasswordRecord | null {
  const passHash = toArrayBuffer(intent.password_hash);
  const passSalt = toArrayBuffer(intent.password_salt);
  if (!passHash || !passSalt) return null;
  if (!isStoredScryptV1(intent)) return null;
  return {
    hash: new Uint8Array(passHash),
    salt: new Uint8Array(passSalt),
    kdf: PASSWORD_KDF,
    cost: intent.password_cost as number,
    blockSize: intent.password_block_size as number,
    parallelization: intent.password_parallelization as number,
  };
}
