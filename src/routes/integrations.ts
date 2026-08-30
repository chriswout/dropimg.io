import { Hono } from "hono";
import { track } from "../lib/analytics";
import { entitlementsFor } from "../lib/entitlements";
import {
  maskEmail,
  resolveIntegrationToken,
} from "../lib/integration-token";
import {
  createOwnedUploadIntent,
  executeOwnedUploadFromRequest,
} from "../lib/owned-upload";
import { normalizeUploadClient } from "../lib/upload-client";

type Env = {
  Bindings: Cloudflare.Env;
};

export const integrationRoutes = new Hono<Env>();

integrationRoutes.get("/api/integrations/me", async (c) => {
  const auth = await resolveIntegrationToken(c.req.raw, c.env.DB, {
    waitUntil: (p) => c.executionCtx.waitUntil(p),
  });
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const user = await c.env.DB.prepare(
    `SELECT email FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
  )
    .bind(auth.userId)
    .first<{ email: string }>();
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const entitlements = await entitlementsFor(c.env, auth.userId);
  return c.json({
    connected: true,
    user: { emailMasked: maskEmail(user.email) },
    entitlements: {
      plan: entitlements.plan,
      maxUploadBytes: entitlements.maxUploadBytes,
      allowedExpirySeconds: entitlements.allowedExpirySeconds,
      defaultExpirySeconds: entitlements.defaultExpirySeconds,
      passwordProtection: entitlements.passwordProtection,
    },
  });
});

integrationRoutes.post("/api/integrations/upload-intent", async (c) => {
  const auth = await resolveIntegrationToken(c.req.raw, c.env.DB, {
    waitUntil: (p) => c.executionCtx.waitUntil(p),
  });
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

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

  const created = await createOwnedUploadIntent(c.env, auth.userId, { expiry, password });
  if (!created.ok) {
    return c.json(
      { error: created.error, ...(created.detail ? { detail: created.detail } : {}) },
      created.status,
    );
  }
  return c.json({
    id: created.id,
    uploadUrl: `/api/integrations/upload/${created.id}`,
    maxBytes: created.maxBytes,
    expirySeconds: created.expirySeconds,
  });
});

integrationRoutes.post("/api/integrations/upload/:intent", async (c) => {
  const auth = await resolveIntegrationToken(c.req.raw, c.env.DB, {
    waitUntil: (p) => c.executionCtx.waitUntil(p),
  });
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const res = await executeOwnedUploadFromRequest(c, auth.userId, c.req.param("intent"));
  if (res.status === 201) {
    track(c.env.ANALYTICS, "integration_upload_ok", {
      client: normalizeUploadClient(c.req.header("x-dropimg-client")),
    });
  }
  return res;
});
