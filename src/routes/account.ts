import { Hono } from "hono";
import type { Context } from "hono";
import { track } from "../lib/analytics";
import { deleteUserAccount } from "../lib/account-delete";
import { csrfOriginOk } from "../lib/auth/csrf";
import { toArrayBuffer } from "../lib/d1-blob";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import {
  clearSessionCookie,
  resolveSession,
  type SessionUser,
} from "../lib/auth/session";
import {
  EXPIRY_30D,
  entitlementsFor,
  flagsFromEnv,
  FREE_HISTORY_LIMIT,
  loadSubscription,
  PRO_HISTORY_PAGE,
  resolveEntitlements,
} from "../lib/entitlements";
import {
  hashImagePassword,
  imageHasPassword,
  PASSWORD_MIN_LENGTH,
} from "../lib/image-password";
import {
  buildSharexConfig,
  createIntegrationToken,
  listIntegrationTokens,
  normalizeIntegrationKind,
  revokeIntegrationToken,
  validateIntegrationLabel,
} from "../lib/integration-token";
import {
  createOwnedUploadIntent,
  executeOwnedUploadFromRequest,
} from "../lib/owned-upload";
import { removeImage } from "../lib/remove-image";
import { isValidSlug } from "../lib/slug";
import { verifyDeleteToken } from "../lib/tokens";
import { moveImageToProPrefix } from "../lib/upload-store";
import type { ImageRow } from "../types";
import {
  accountHtmlResponse,
  billingHtmlResponse,
  integrationsHtmlResponse,
} from "../views/account";
import { appHtmlResponse, type AppDrop } from "../views/app";

type Env = {
  Bindings: Cloudflare.Env;
};

export const accountRoutes = new Hono<Env>();

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

type SettingsRenderer = (
  props: Parameters<typeof accountHtmlResponse>[0],
) => Response;

/** Loads the session, entitlements, and subscription every settings page needs. */
async function settingsPage(
  c: Context<Env>,
  render: SettingsRenderer,
): Promise<Response> {
  const locale = resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.redirect("/login", 302);

  const entitlements = await entitlementsFor(c.env, session.id);
  const subscription = await loadSubscription(c.env.DB, session.id);
  return render({
    locale,
    env: c.env,
    email: session.email,
    plan: entitlements.plan === "pro" ? "pro" : "free",
    periodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
  });
}

/*
 * `/account` predates the /app/* structure and is hard-coded in shipped
 * builds of the browser extension, which sends people here to mint a token.
 * It stays a real page and renders Integrations so that flow still lands
 * on the right screen.
 */
accountRoutes.get("/account", (c) => settingsPage(c, integrationsHtmlResponse));

accountRoutes.get("/app/integrations", (c) =>
  settingsPage(c, integrationsHtmlResponse),
);

accountRoutes.get("/app/billing", (c) => settingsPage(c, billingHtmlResponse));

accountRoutes.get("/app/account", (c) => settingsPage(c, accountHtmlResponse));

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
    `SELECT slug, mime, size, width, height, created_at, expires_at,
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

  let expiry: number | undefined;
  let password: string | undefined;
  try {
    const body = (await c.req.json()) as { expiry?: number; password?: string };
    if (body.expiry != null) expiry = Number(body.expiry);
    if (typeof body.password === "string" && body.password.length > 0) {
      password = body.password;
    }
  } catch {
    expiry = undefined;
  }

  const created = await createOwnedUploadIntent(c.env, session.id, { expiry, password });
  if (!created.ok) {
    return c.json(
      { error: created.error, ...(created.detail ? { detail: created.detail } : {}) },
      created.status,
    );
  }
  return c.json({
    id: created.id,
    uploadUrl: `/api/account/upload/${created.id}`,
    maxBytes: created.maxBytes,
    expirySeconds: created.expirySeconds,
  });
});

accountRoutes.post("/api/account/upload/:intent", async (c) => {
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return executeOwnedUploadFromRequest(c, session.id, c.req.param("intent"));
});

accountRoutes.get("/api/account/integrations", async (c) => {
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const tokens = await listIntegrationTokens(c.env.DB, session.id);
  return c.json({
    tokens: tokens.map((row) => ({
      id: row.id,
      label: row.label,
      scope: row.scope,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
    })),
  });
});

accountRoutes.post("/api/account/integrations", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let labelRaw: unknown;
  let kindRaw: unknown;
  try {
    const body = (await c.req.json()) as { label?: unknown; kind?: unknown };
    labelRaw = body.label;
    kindRaw = body.kind;
  } catch {
    return c.json({ error: "Label is required." }, 400);
  }
  const label = validateIntegrationLabel(labelRaw);
  if (!label) {
    return c.json({ error: "Enter a label between 1 and 50 characters." }, 400);
  }
  const kind = normalizeIntegrationKind(kindRaw);
  const created = await createIntegrationToken(c.env.DB, {
    userId: session.id,
    label,
  });
  track(c.env.ANALYTICS, "integration_token_created", { reason: kind });
  if (kind === "extension") {
    track(c.env.ANALYTICS, "integration_connected_extension", { reason: "created" });
  }
  const origin = new URL(c.req.url).origin;
  return c.json({
    id: created.id,
    label: created.label,
    token: created.token,
    createdAt: created.createdAt,
    sharexConfig: buildSharexConfig(origin, created.token),
  });
});

accountRoutes.post("/api/account/integrations/:id/revoke", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await requireSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const result = await revokeIntegrationToken(c.env.DB, {
    userId: session.id,
    tokenId: c.req.param("id"),
  });
  if (result === "missing") return c.json({ error: "Not found" }, 404);
  track(c.env.ANALYTICS, "integration_token_revoked", { reason: result });
  return c.json({ ok: true, revoked: true });
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
      `UPDATE images SET
         password_hash = NULL, password_salt = NULL, password_kdf = NULL, password_iterations = NULL,
         password_cost = NULL, password_block_size = NULL, password_parallelization = NULL
       WHERE slug = ?`,
    )
      .bind(slug)
      .run();
    track(c.env.ANALYTICS, "password_set", { reason: "removed" });
    return c.json({ ok: true, locked: false });
  }

  try {
    const hashed = await hashImagePassword(password);
    await c.env.DB.prepare(
      `UPDATE images SET
         password_hash = ?, password_salt = ?, password_kdf = ?, password_iterations = NULL,
         password_cost = ?, password_block_size = ?, password_parallelization = ?
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
        hashed.cost,
        hashed.blockSize,
        hashed.parallelization,
        slug,
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "hash_failed";
    console.error("password_set_failed", msg);
    return c.json({ error: "Could not save password." }, 500);
  }
  track(c.env.ANALYTICS, "password_set", {
    reason: imageHasPassword(row) ? "changed" : "set",
  });
  track(c.env.ANALYTICS, "password_protection_used", {
    plan: "pro",
    client: "web",
    reason: "dashboard",
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
