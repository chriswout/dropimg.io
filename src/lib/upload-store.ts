import { track } from "./analytics";
import { inspectImage } from "./inspect";
import { runPostStripSafetyScan } from "./moderation-hook";
import { generateSlug } from "./slug";
import { StripMetadataError, stripMetadata } from "./strip";
import type { ImagePasswordRecord } from "./image-password";
import {
  generateDeleteToken,
  hashDeleteToken,
  r2Key,
  r2KeyClassOf,
  uuid,
  type R2KeyClass,
} from "./tokens";
import {
  QUOTA_WINDOW_SECONDS,
  type UploadErrorResponse,
  type UploadResponse,
} from "../types";

export const DAILY_UPLOAD_LIMIT = 100;
export const DAILY_BYTE_LIMIT = 500 * 1024 * 1024;

export type StoreUploadInput = {
  bytes: ArrayBuffer;
  client: string;
  pageIntent: string;
  ipHash: string;
  userId: string | null;
  expirySeconds: number;
  maxBytes: number;
  origin: string;
  r2Class?: R2KeyClass;
  password?: ImagePasswordRecord | null;
};

export type StoreUploadFail = {
  ok: false;
  status: 400 | 413 | 415 | 422 | 500;
  code: UploadErrorResponse["code"];
  error: string;
  reason?: string;
};

export type StoreUploadOk = {
  ok: true;
  body: UploadResponse;
};

export async function overDailyQuota(
  db: D1Database,
  opts: { ipHash: string; userId?: string | null; now?: number },
): Promise<boolean> {
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const since = now - QUOTA_WINDOW_SECONDS;

  const ip = await db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(size), 0) as bytes
       FROM images WHERE ip_hash = ? AND created_at >= ?`,
    )
    .bind(opts.ipHash, since)
    .first<{ cnt: number; bytes: number }>();
  if (ip && (ip.cnt >= DAILY_UPLOAD_LIMIT || ip.bytes >= DAILY_BYTE_LIMIT)) {
    return true;
  }

  if (opts.userId) {
    const user = await db
      .prepare(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(size), 0) as bytes
         FROM images WHERE user_id = ? AND created_at >= ?`,
      )
      .bind(opts.userId, since)
      .first<{ cnt: number; bytes: number }>();
    if (
      user &&
      (user.cnt >= DAILY_UPLOAD_LIMIT || user.bytes >= DAILY_BYTE_LIMIT)
    ) {
      return true;
    }
  }

  return false;
}

export function uploadFailResponse(
  fail: StoreUploadFail,
): Response {
  const body: UploadErrorResponse = { error: fail.error, code: fail.code };
  return new Response(JSON.stringify(body), {
    status: fail.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function storeUploadedImage(
  env: Cloudflare.Env,
  ctx: ExecutionContext,
  input: StoreUploadInput,
): Promise<StoreUploadOk | StoreUploadFail> {
  const { bytes, client, pageIntent, ipHash, userId, origin } = input;
  const now = Math.floor(Date.now() / 1000);

  if (bytes.byteLength === 0) {
    return fail(env, 400, "invalid_image", "Empty upload", undefined, client, pageIntent);
  }
  if (bytes.byteLength > input.maxBytes) {
    return fail(
      env,
      413,
      "too_large",
      "File exceeds the size limit",
      undefined,
      client,
      pageIntent,
    );
  }

  const inspected = inspectImage(bytes);
  if (!inspected.ok) {
    if (inspected.reason === "too_many_pixels") {
      return fail(
        env,
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
      env,
      inspected.reason === "invalid" ? 400 : 415,
      inspected.reason === "invalid" ? "invalid_image" : "unsupported_type",
      msg,
      inspected.reason,
      client,
      pageIntent,
    );
  }

  const expiresAt = now + input.expirySeconds;
  const id = uuid();
  const key = r2Key(id, new Date(), input.r2Class ?? "24h");
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
    return fail(env, 422, "invalid_image", msg, "strip_failed", client, pageIntent);
  }

  const scan = await runPostStripSafetyScan({
    bytes: storeBytes,
    mime: inspected.mime,
  });
  if (!scan.ok) {
    return fail(env, 422, "invalid_image", "Image rejected", scan.reason, client, pageIntent);
  }

  const storeSize = storeBytes.byteLength;

  try {
    await env.BUCKET.put(key, storeBytes, {
      httpMetadata: { contentType: inspected.mime },
      customMetadata: { id },
    });
  } catch {
    return fail(env, 500, "server_error", "Storage write failed", undefined, client, pageIntent);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await env.DB.prepare(
        `INSERT INTO images
          (id, slug, r2_key, mime, size, width, height, delete_token_hash, ip_hash, created_at, expires_at, user_id,
           password_hash, password_salt, password_kdf, password_iterations,
           password_cost, password_block_size, password_parallelization)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          userId,
          input.password ? input.password.hash : null,
          input.password ? input.password.salt : null,
          input.password ? input.password.kdf : null,
          null,
          input.password ? input.password.cost : null,
          input.password ? input.password.blockSize : null,
          input.password ? input.password.parallelization : null,
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
      ctx.waitUntil(env.BUCKET.delete(key));
      return fail(env, 500, "server_error", "Database write failed", undefined, client, pageIntent);
    }
  }

  if (!inserted) {
    ctx.waitUntil(env.BUCKET.delete(key));
    return fail(
      env,
      500,
      "server_error",
      "Could not allocate a unique URL",
      undefined,
      client,
      pageIntent,
    );
  }

  track(env.ANALYTICS, "upload_ok", {
    slug,
    mime: inspected.mime,
    size: storeSize,
    client,
    pageIntent,
    expirySeconds: input.expirySeconds,
  });

  return {
    ok: true,
    body: {
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
    },
  };
}

function fail(
  env: Cloudflare.Env,
  status: StoreUploadFail["status"],
  code: UploadErrorResponse["code"],
  error: string,
  reason: string | undefined,
  client: string,
  pageIntent: string,
): StoreUploadFail {
  track(env.ANALYTICS, "upload_fail", {
    reason: reason ?? code,
    client,
    pageIntent,
  });
  return { ok: false, status, code, error, reason };
}

/**
 * Promote a short-lifecycle object (`o/24h` or `o/7d`) into `o/pro`.
 *
 * Copy, verify, repoint D1, then delete. Callers must run this to completion
 * before writing a longer `expires_at`, otherwise the bucket rule would delete
 * the object well before the database thinks it expires.
 */
export async function moveImageToProPrefix(
  env: { DB: D1Database; BUCKET: R2Bucket },
  row: { slug: string; r2_key: string },
): Promise<{ ok: true; r2Key: string } | { ok: false }> {
  if (r2KeyClassOf(row.r2_key) === "pro") {
    return { ok: true, r2Key: row.r2_key };
  }
  const object = await env.BUCKET.get(row.r2_key);
  if (!object) return { ok: false };
  const id = row.r2_key.split("/").pop() || crypto.randomUUID();
  const nextKey = r2Key(id, new Date(), "pro");
  const body = await object.arrayBuffer();
  await env.BUCKET.put(nextKey, body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  });
  const verify = await env.BUCKET.head(nextKey);
  if (!verify) return { ok: false };
  await env.DB.prepare(`UPDATE images SET r2_key = ? WHERE slug = ?`)
    .bind(nextKey, row.slug)
    .run();
  try {
    await env.BUCKET.delete(row.r2_key);
  } catch {
    // new object is canonical
  }
  return { ok: true, r2Key: nextKey };
}
