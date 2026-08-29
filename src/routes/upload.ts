import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import { inspectImage } from "../lib/inspect";
import { clientIp, hashIp } from "../lib/ip";
import { normalizePageIntent } from "../lib/page-intent";
import { resolveIpHashSecret } from "../lib/secrets";
import { generateSlug } from "../lib/slug";
import { StripMetadataError, stripMetadata } from "../lib/strip";
import { runPostStripSafetyScan } from "../lib/moderation-hook";
import {
  generateDeleteToken,
  hashDeleteToken,
  r2Key,
  uuid,
} from "../lib/tokens";
import { normalizeUploadClient } from "../lib/upload-client";
import {
  MAX_UPLOAD_BYTES,
  TTL_SECONDS,
  type UploadErrorResponse,
  type UploadResponse,
} from "../types";

type Env = {
  Bindings: Cloudflare.Env;
};

const DAILY_UPLOAD_LIMIT = 100;
const DAILY_BYTE_LIMIT = 500 * 1024 * 1024;

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
    return fail(c, 413, "too_large", "File exceeds 10 MB limit", undefined, client, pageIntent);
  }

  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) {
    return fail(
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

  // Burst rate limit (Workers Rate Limiting binding) — skip if unbound (local)
  const limiter = c.env.UPLOAD_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `upload:${ipHash}` });
    if (!success) {
      track(c.env.ANALYTICS, "rate_limited", { reason: "burst", client, pageIntent });
      return fail(c, 429, "rate_limited", "Too many uploads. Try again shortly.", undefined, client, pageIntent);
    }
  }

  // Daily quota (D1) — long window the binding cannot cover
  const now = Math.floor(Date.now() / 1000);
  const since = now - TTL_SECONDS;
  const quota = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(size), 0) as bytes
     FROM images WHERE ip_hash = ? AND created_at >= ?`,
  )
    .bind(ipHash, since)
    .first<{ cnt: number; bytes: number }>();

  if (quota && (quota.cnt >= DAILY_UPLOAD_LIMIT || quota.bytes >= DAILY_BYTE_LIMIT)) {
    track(c.env.ANALYTICS, "rate_limited", { reason: "daily_quota", client, pageIntent });
    return fail(
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
    return fail(c, 400, "invalid_image", "Could not read upload body", undefined, client, pageIntent);
  }

  if (bytes.byteLength === 0) {
    return fail(c, 400, "invalid_image", "Empty upload", undefined, client, pageIntent);
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return fail(c, 413, "too_large", "File exceeds 10 MB limit", undefined, client, pageIntent);
  }

  const inspected = inspectImage(bytes);
  if (!inspected.ok) {
    if (inspected.reason === "too_many_pixels") {
      return fail(
        c,
        422,
        "invalid_image",
        "Image dimensions exceed the 50 megapixel limit",
        "too_many_pixels",
        client,
        pageIntent,
      );
    }
    const msg =
      inspected.reason === "svg"
        ? "SVG uploads are not allowed"
        : inspected.reason === "invalid"
          ? "Invalid or truncated image file"
          : "Unsupported or invalid image. Use PNG, JPEG, WebP, or GIF.";
    return fail(
      c,
      inspected.reason === "invalid" ? 400 : 415,
      inspected.reason === "invalid" ? "invalid_image" : "unsupported_type",
      msg,
      inspected.reason,
      client,
      pageIntent,
    );
  }

  const expiresAt = now + TTL_SECONDS;
  const id = uuid();
  const key = r2Key(id);
  const deleteToken = generateDeleteToken();
  const deleteTokenHash = await hashDeleteToken(deleteToken);

  let slug = generateSlug();
  let inserted = false;

  let storeBytes: ArrayBuffer;
  try {
    storeBytes = stripMetadata(bytes, inspected.mime);
  } catch (err) {
    const msg =
      err instanceof StripMetadataError
        ? err.message
        : "Could not strip image metadata";
    return fail(c, 422, "invalid_image", msg, "strip_failed", client, pageIntent);
  }

  const scan = await runPostStripSafetyScan({
    bytes: storeBytes,
    mime: inspected.mime,
  });
  if (!scan.ok) {
    return fail(c, 422, "invalid_image", "Image rejected", scan.reason, client, pageIntent);
  }

  const storeSize = storeBytes.byteLength;

  try {
    await c.env.BUCKET.put(key, storeBytes, {
      httpMetadata: { contentType: inspected.mime },
      customMetadata: { id },
    });
  } catch {
    return fail(c, 500, "server_error", "Storage write failed", undefined, client, pageIntent);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await c.env.DB.prepare(
        `INSERT INTO images
          (id, slug, r2_key, mime, size, width, height, delete_token_hash, ip_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          slug,
          key,
          inspected.mime,
          storeSize,
          inspected.width,
          inspected.height,
          new Uint8Array(deleteTokenHash),
          ipHash,
          now,
          expiresAt,
        )
        .run();
      inserted = true;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        slug = generateSlug();
        continue;
      }
      c.executionCtx.waitUntil(c.env.BUCKET.delete(key));
      return fail(c, 500, "server_error", "Database write failed", undefined, client, pageIntent);
    }
  }

  if (!inserted) {
    c.executionCtx.waitUntil(c.env.BUCKET.delete(key));
    return fail(c, 500, "server_error", "Could not allocate a unique URL", undefined, client, pageIntent);
  }

  track(c.env.ANALYTICS, "upload_ok", {
    slug,
    mime: inspected.mime,
    size: storeSize,
    client,
    pageIntent,
  });

  const origin = new URL(c.req.url).origin;
  const body: UploadResponse = {
    slug,
    url: `${origin}/${slug}`,
    imageUrl: `${origin}/i/${slug}`,
    deleteUrl: `${origin}/d/${slug}`,
    deleteToken,
    expiresAt,
    width: inspected.width,
    height: inspected.height,
    size: storeSize,
    mime: inspected.mime,
  };

  return c.json(body, 201);
});

function fail(
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
