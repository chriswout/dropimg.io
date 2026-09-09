import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import { createDrop, dropFailResponse } from "../lib/create-drop";
import { EXPIRY_HEADER } from "../lib/entitlements";
import { clientIp, hashIp } from "../lib/ip";
import { normalizePageIntent } from "../lib/page-intent";
import { resolveIpHashSecret } from "../lib/secrets";
import { normalizeUploadClient } from "../lib/upload-client";
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

  let bytes: ArrayBuffer;
  try {
    bytes = await c.req.arrayBuffer();
  } catch {
    return routeFail(c, 400, "invalid_image", "Could not read upload body", undefined, client, pageIntent);
  }

  const stored = await createDrop(c.env, c.executionCtx, {
    userId: null,
    source: client,
    bytes,
    expiry: c.req.header(EXPIRY_HEADER),
    origin: new URL(c.req.url).origin,
    ipHash,
    pageIntent,
    maxBytesCap: MAX_UPLOAD_BYTES,
  });
  if (!stored.ok) return dropFailResponse(stored);
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
