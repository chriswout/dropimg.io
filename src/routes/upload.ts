import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import { clientIp, hashIp } from "../lib/ip";
import { normalizePageIntent } from "../lib/page-intent";
import { resolveIpHashSecret } from "../lib/secrets";
import { normalizeUploadClient } from "../lib/upload-client";
import {
  overDailyQuota,
  storeUploadedImage,
  uploadFailResponse,
} from "../lib/upload-store";
import { MAX_UPLOAD_BYTES, type UploadErrorResponse } from "../types";

type Env = {
  Bindings: Cloudflare.Env;
};

function uploadClient(c: Context<Env>): string {
  return normalizeUploadClient(c.req.header("x-dropimg-client"));
}

function uploadPageIntent(c: Context<Env>): string {
  return normalizePageIntent(c.req.header("x-dropimg-page-intent"));
}

export const uploadRoutes = new Hono<Env>();

uploadRoutes.post("/api/upload", async (c) => {
  const client = uploadClient(c);
  const pageIntent = uploadPageIntent(c);
  const contentLength = Number(c.req.header("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return routeFail(c, 413, "too_large", "File exceeds 10 MB limit", undefined, client, pageIntent);
  }

  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) {
    return routeFail(
      c,
      500,
      "server_error",
      "Upload temporarily unavailable",
      "misconfigured_secret",
      client,
      pageIntent,
    );
  }
  const ip = clientIp(c.req.raw);
  const ipHash = await hashIp(ip, secretResolved.secret);

  const limiter = c.env.UPLOAD_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `upload:${ipHash}` });
    if (!success) {
      track(c.env.ANALYTICS, "rate_limited", { reason: "burst", client, pageIntent });
      return routeFail(c, 429, "rate_limited", "Too many uploads. Try again shortly.", undefined, client, pageIntent);
    }
  }

  if (await overDailyQuota(c.env.DB, { ipHash })) {
    track(c.env.ANALYTICS, "rate_limited", { reason: "daily_quota", client, pageIntent });
    return routeFail(
      c,
      429,
      "quota_exceeded",
      "Daily upload limit reached. Try again tomorrow.",
      undefined,
      client,
      pageIntent,
    );
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await c.req.arrayBuffer();
  } catch {
    return routeFail(c, 400, "invalid_image", "Could not read upload body", undefined, client, pageIntent);
  }

  const stored = await storeUploadedImage(c.env, c.executionCtx, {
    bytes,
    client,
    pageIntent,
    ipHash,
    userId: null,
    expirySeconds: 24 * 60 * 60,
    maxBytes: MAX_UPLOAD_BYTES,
    origin: new URL(c.req.url).origin,
  });
  if (!stored.ok) return uploadFailResponse(stored);
  return c.json(stored.body, 201);
});

function routeFail(
  c: Context<Env>,
  status: 400 | 413 | 415 | 422 | 429 | 500,
  code: UploadErrorResponse["code"],
  error: string,
  reason?: string,
  client = "web",
  pageIntent = "",
) {
  track(c.env.ANALYTICS, "upload_fail", {
    reason: reason ?? code,
    client,
    pageIntent,
  });
  const body: UploadErrorResponse = { error, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
