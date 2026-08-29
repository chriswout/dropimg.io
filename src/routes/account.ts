import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import { deleteUserAccount } from "../lib/account-delete";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import {
  clearSessionCookie,
  resolveSession,
  type SessionUser,
} from "../lib/auth/session";
import { toArrayBuffer } from "../lib/d1-blob";
import {
  EXPIRY_24H,
  EXPIRY_30D,
  entitlementsFor,
  flagsFromEnv,
  FREE_HISTORY_LIMIT,
  loadSubscription,
  PRO_HISTORY_PAGE,
  resolveEntitlements,
  uploadIntentAllowed,
} from "../lib/entitlements";
import {
  hashImagePassword,
  imageHasPassword,
  PASSWORD_MIN_LENGTH,
} from "../lib/image-password";
import { clientIp, hashIp } from "../lib/ip";
import { normalizePageIntent } from "../lib/page-intent";
import { removeImage } from "../lib/remove-image";
import { resolveIpHashSecret } from "../lib/secrets";
import { isValidSlug } from "../lib/slug";
import { uuid, verifyDeleteToken } from "../lib/tokens";
import { normalizeUploadClient } from "../lib/upload-client";
import {
  moveImageToProPrefix,
  overDailyQuota,
  storeUploadedImage,
  uploadFailResponse,
} from "../lib/upload-store";
import type { ImageRow } from "../types";
import { accountHtmlResponse } from "../views/account";
import { appHtmlResponse, type AppDrop } from "../views/app";

type Env = {
  Bindings: Cloudflare.Env;
};

export const accountRoutes = new Hono<Env>();

const INTENT_TTL_SECONDS = 10 * 60;
const CLAIM_MAX_ITEMS = 20;

accountRoutes.get("/api/account/me", async (c) => {
  const locale = resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  const flags = flagsFromEnv(c.env);

  if (!session) {
    return c.json({
      user: null,
      locale,
      entitlements: resolveEntitlements({ userId: null, flags }),
    });
  }

  const entitlements = await entitlementsFor(c.env, session.id);
  return c.json({
    user: {
      id: session.id,
      email: session.email,
    },
    locale,
    entitlements,
  });
});

accountRoutes.get("/account", async (c) => {
  const locale = resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.redirect("/login", 302);

  const entitlements = await entitlementsFor(c.env, session.id);
  const subscription = await loadSubscription(c.env.DB, session.id);
  return accountHtmlResponse({
    locale,
    env: c.env,
    email: session.email,
    plan: entitlements.plan === "pro" ? "pro" : "free",
    periodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
  });
});

accountRoutes.get("/app", async (c) => {
  const locale = resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.redirect("/login", 302);

  const entitlements = await entitlementsFor(c.env, session.id);
  const now = Math.floor(Date.now() / 1000);
  const cursorRaw = c.req.query("cursor");
  const cursor = cursorRaw ? Number(cursorRaw) : NaN;
  const useCursor = Number.isFinite(cursor) && cursor > 0;
  const pageSize =
    entitlements.historyLimit == null ? PRO_HISTORY_PAGE : entitlements.historyLimit;

  const rows = await c.env.DB.prepare(
    `SELECT slug, mime, size, created_at, expires_at,
            CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END AS locked
     FROM images
     WHERE user_id = ? AND deleted_at IS NULL AND expires_at > ?
       AND (? = 0 OR created_at < ?)
     ORDER BY created_at DESC, slug DESC
     LIMIT ?`,
  )
    .bind(session.id, now, useCursor ? 1 : 0, useCursor ? cursor : 0, pageSize + 1)
    .all<AppDrop>();

  const list = rows.results ?? [];
  const hasMore = list.length > pageSize;
  const drops = hasMore ? list.slice(0, pageSize) : list;
  const nextCursor =
    entitlements.historyLimit == null && hasMore
      ? drops[drops.length - 1]!.created_at
      : null;

  return appHtmlResponse({
    locale,
    env: c.env,
    origin: new URL(c.req.url).origin,
    email: session.email,
    plan: entitlements.plan,
    canExtend: entitlements.plan === "pro" && entitlements.allowedExpirySeconds.includes(EXPIRY_30D),
    canPassword: entitlements.passwordProtection,
    drops,
    historyCapped: entitlements.historyLimit === FREE_HISTORY_LIMIT,
    nextCursor,
  });
});

accountRoutes.post("/api/account/claim", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let items: { slug?: string; deleteToken?: string }[] = [];
  try {
    const body = (await c.req.json()) as { items?: unknown };
    if (Array.isArray(body.items)) items = body.items as typeof items;
  } catch {
    return c.json({ error: "Invalid body" }, 400);
  }

  items = items.slice(0, CLAIM_MAX_ITEMS);
  let claimed = 0;
  let skipped = 0;
  const now = Math.floor(Date.now() / 1000);

  for (const item of items) {
    const slug = String(item.slug ?? "");
    const token = String(item.deleteToken ?? "");
    if (!isValidSlug(slug) || !token) {
      skipped += 1;
      continue;
    }
    const row = await c.env.DB.prepare(
      `SELECT * FROM images WHERE slug = ? LIMIT 1`,
    )
      .bind(slug)
      .first<ImageRow>();
    if (!row || row.deleted_at || row.expires_at <= now) {
      skipped += 1;
      continue;
    }
    const stored = toArrayBuffer(row.delete_token_hash);
    if (!stored || !(await verifyDeleteToken(token, stored))) {
      skipped += 1;
      continue;
    }
    if (row.user_id && row.user_id !== session.id) {
      skipped += 1;
      continue;
    }
    if (row.user_id === session.id) {
      claimed += 1;
      continue;
    }
    await c.env.DB.prepare(
      `UPDATE images SET user_id = ? WHERE slug = ? AND user_id IS NULL AND deleted_at IS NULL`,
    )
      .bind(session.id, slug)
      .run();
    claimed += 1;
  }

  if (claimed > 0) {
    track(c.env.ANALYTICS, "claim_ok", { reason: String(claimed) });
  }
  return c.json({ ok: true, claimed, skipped });
});

accountRoutes.post("/api/account/upload-intent", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const entitlements = await entitlementsFor(c.env, session.id);
  let expiry = EXPIRY_24H;
  let password: string | null = null;
  try {
    const body = (await c.req.json()) as { expiry?: number; password?: string };
    if (body.expiry != null) expiry = Number(body.expiry);
    if (typeof body.password === "string" && body.password.length > 0) {
      password = body.password;
    }
  } catch {
    expiry = EXPIRY_24H;
  }
  if (!entitlements.allowedExpirySeconds.includes(expiry)) {
    return c.json({ error: "That expiry is not available." }, 400);
  }
  if (password) {
    if (!entitlements.passwordProtection) {
      return c.json({ error: "Password protection is not available." }, 400);
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return c.json({ error: "Password must be at least 8 characters." }, 400);
    }
  }

  let hashed = null;
  if (password) {
    try {
      hashed = await hashImagePassword(password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "hash_failed";
      console.error("password_intent_hash_failed", msg);
      return c.json(
        {
          error: "Could not save password.",
          ...(c.env.ENVIRONMENT === "production" ? {} : { detail: msg }),
        },
        500,
      );
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const id = uuid();
  await c.env.DB.prepare(
    `INSERT INTO upload_intents
      (id, user_id, expiry_seconds, max_bytes, created_at, expires_at,
       password_hash, password_salt, password_kdf, password_iterations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      session.id,
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
      hashed?.iterations ?? null,
    )
    .run();

  return c.json({
    id,
    uploadUrl: `/api/account/upload/${id}`,
    maxBytes: entitlements.maxUploadBytes,
    expirySeconds: expiry,
  });
});

accountRoutes.post("/api/account/upload/:intent", async (c) => {
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const intentId = c.req.param("intent");
  const now = Math.floor(Date.now() / 1000);
  const intent = await c.env.DB.prepare(
    `SELECT expiry_seconds, max_bytes, password_hash, password_salt, password_kdf, password_iterations
     FROM upload_intents
     WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(intentId, session.id, now)
    .first<{
      expiry_seconds: number;
      max_bytes: number;
      password_hash: unknown;
      password_salt: unknown;
      password_kdf: string | null;
      password_iterations: number | null;
    }>();
  if (!intent) {
    return c.json({ error: "Upload intent is invalid or expired." }, 400);
  }

  const entitlements = await entitlementsFor(c.env, session.id);
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
      .bind(now, intentId, session.id)
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
    .bind(now, intentId, session.id, now)
    .run();
  if (!used.meta.changes) {
    return c.json({ error: "Upload intent is invalid or expired." }, 400);
  }
  const taken = intent;

  const client = normalizeUploadClient(c.req.header("x-dropimg-client"));
  const pageIntent = normalizePageIntent(c.req.header("x-dropimg-page-intent"));
  const contentLength = Number(c.req.header("content-length") || 0);
  const maxBytes = Math.min(taken.max_bytes, entitlements.maxUploadBytes);
  if (contentLength > maxBytes) {
    return c.json({ error: "File exceeds the size limit", code: "too_large" }, 413);
  }

  const secretResolved = resolveIpHashSecret(c.env);
  if (!secretResolved.ok) {
    return c.json({ error: "Upload temporarily unavailable", code: "server_error" }, 500);
  }
  const ip = clientIp(c.req.raw);
  const ipHash = await hashIp(ip, secretResolved.secret);

  const limiter = c.env.UPLOAD_LIMIT;
  if (limiter) {
    const { success } = await limiter.limit({ key: `upload:${ipHash}` });
    if (!success) {
      track(c.env.ANALYTICS, "rate_limited", { reason: "burst", client, pageIntent });
      return c.json({ error: "Too many uploads. Try again shortly.", code: "rate_limited" }, 429);
    }
  }

  if (await overDailyQuota(c.env.DB, { ipHash, userId: session.id })) {
    track(c.env.ANALYTICS, "rate_limited", { reason: "daily_quota", client, pageIntent });
    return c.json(
      { error: "Daily upload limit reached. Try again tomorrow.", code: "quota_exceeded" },
      429,
    );
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await c.req.arrayBuffer();
  } catch {
    return c.json({ error: "Could not read upload body", code: "invalid_image" }, 400);
  }

  const passHash = toArrayBuffer(taken.password_hash);
  const passSalt = toArrayBuffer(taken.password_salt);
  const stored = await storeUploadedImage(c.env, c.executionCtx, {
    bytes,
    client,
    pageIntent,
    ipHash,
    userId: session.id,
    expirySeconds: taken.expiry_seconds,
    maxBytes,
    origin: new URL(c.req.url).origin,
    r2Class: entitlements.plan === "pro" ? "pro" : "24h",
    password:
      passHash && passSalt && taken.password_iterations
        ? {
            hash: new Uint8Array(passHash),
            salt: new Uint8Array(passSalt),
            kdf: "pbkdf2-sha256",
            iterations: taken.password_iterations,
          }
        : null,
  });
  if (!stored.ok) return uploadFailResponse(stored);
  return c.json(stored.body, 201);
});

accountRoutes.post("/api/account/images/:slug/delete", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "Not found" }, 404);

  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? AND user_id = ? LIMIT 1`,
  )
    .bind(slug, session.id)
    .first<ImageRow>();
  if (!row) return c.json({ error: "Not found" }, 404);

  const result = await removeImage(c.env, row, "user");
  if (!result.alreadyDeleted) {
    track(c.env.ANALYTICS, "delete_user", {
      slug,
      mime: row.mime,
      size: row.size,
    });
  }
  return c.json({ ok: true, alreadyDeleted: result.alreadyDeleted });
});

accountRoutes.post("/api/account/images/:slug/extend", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const entitlements = await entitlementsFor(c.env, session.id);
  if (entitlements.plan !== "pro" || !entitlements.allowedExpirySeconds.includes(EXPIRY_30D)) {
    return c.json({ error: "Extend is not available." }, 400);
  }

  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "Not found" }, 404);
  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? AND user_id = ? LIMIT 1`,
  )
    .bind(slug, session.id)
    .first<ImageRow>();
  if (!row || row.deleted_at) return c.json({ error: "Not found" }, 404);

  const cap = row.created_at + EXPIRY_30D;
  if (row.expires_at >= cap) {
    return c.json({ error: "Already at the 30-day maximum." }, 400);
  }

  const moved = await moveImageToProPrefix(c.env, row);
  if (!moved.ok) return c.json({ error: "Could not move image storage." }, 500);

  await c.env.DB.prepare(`UPDATE images SET expires_at = ? WHERE slug = ?`)
    .bind(cap, slug)
    .run();
  track(c.env.ANALYTICS, "extend_ok", { slug });
  return c.json({ ok: true, expiresAt: cap });
});

accountRoutes.post("/api/account/images/:slug/password", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const entitlements = await entitlementsFor(c.env, session.id);
  if (!entitlements.passwordProtection) {
    return c.json({ error: "Password protection is not available." }, 400);
  }

  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return c.json({ error: "Not found" }, 404);
  const row = await c.env.DB.prepare(
    `SELECT * FROM images WHERE slug = ? AND user_id = ? LIMIT 1`,
  )
    .bind(slug, session.id)
    .first<ImageRow>();
  if (!row || row.deleted_at) return c.json({ error: "Not found" }, 404);

  let password: string | null = null;
  try {
    const body = (await c.req.json()) as { password?: string | null };
    if (typeof body.password === "string" && body.password.length > 0) {
      password = body.password;
    }
  } catch {
    password = null;
  }

  if (password && password.length < PASSWORD_MIN_LENGTH) {
    return c.json({ error: "Password must be at least 8 characters." }, 400);
  }

  if (!password) {
    await c.env.DB.prepare(
      `UPDATE images SET password_hash = NULL, password_salt = NULL, password_kdf = NULL, password_iterations = NULL
       WHERE slug = ?`,
    )
      .bind(slug)
      .run();
    track(c.env.ANALYTICS, "password_set", { slug, reason: "removed" });
    return c.json({ ok: true, locked: false });
  }

  try {
    const hashed = await hashImagePassword(password);
    await c.env.DB.prepare(
      `UPDATE images SET password_hash = ?, password_salt = ?, password_kdf = ?, password_iterations = ?
       WHERE slug = ?`,
    )
      .bind(
        hashed.hash.buffer.slice(
          hashed.hash.byteOffset,
          hashed.hash.byteOffset + hashed.hash.byteLength,
        ),
        hashed.salt.buffer.slice(
          hashed.salt.byteOffset,
          hashed.salt.byteOffset + hashed.salt.byteLength,
        ),
        hashed.kdf,
        hashed.iterations,
        slug,
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "hash_failed";
    console.error("password_set_failed", msg);
    return c.json({ error: "Could not save password." }, 500);
  }
  track(c.env.ANALYTICS, "password_set", {
    slug,
    reason: imageHasPassword(row) ? "changed" : "set",
  });
  return c.json({ ok: true, locked: true, alreadyLocked: imageHasPassword(row) });
});

accountRoutes.post("/api/account/delete", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const now = Math.floor(Date.now() / 1000);
  const deleted = await deleteUserAccount(c.env, session.id, now);
  if (!deleted.ok) {
    return c.json({ error: deleted.error }, deleted.status);
  }
  track(c.env.ANALYTICS, "account_deleted", { reason: "user" });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearSessionCookie(c.env),
    },
  });
});

async function requireSession(
  c: Context<Env>,
): Promise<SessionUser | null> {
  return resolveSession(c.env.DB, c.req.header("cookie"));
}
