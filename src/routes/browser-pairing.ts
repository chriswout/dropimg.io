import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import { isBrowserPairingId } from "../lib/auth/next-path";
import { resolveSession } from "../lib/auth/session";
import {
  approveBrowserPairing,
  cancelBrowserPairing,
  consumeApprovedPairing,
  extensionPairingLabel,
  isPairingClient,
  loadPairingById,
  loadPairingBySecret,
  pairingPublicStatus,
  startBrowserPairing,
  sweepExpiredPairing,
  type PairingClient,
} from "../lib/browser-pairing";
import { connectBrowserHtmlResponse, type ConnectBrowserState } from "../views/connect-browser";

type Env = { Bindings: Cloudflare.Env };

export const browserPairingRoutes = new Hono<Env>();

function jsonStatus(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

async function readJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

browserPairingRoutes.post("/api/integrations/browser/start", async (c) => {
  const body = await readJson(c.req.raw);
  const client = body?.client;
  if (!isPairingClient(client)) {
    return jsonStatus(400, { error: "Unknown client", code: "invalid_client" });
  }
  const started = await startBrowserPairing(c.env.DB, {
    client,
    origin: new URL(c.req.url).origin,
  });
  return jsonStatus(200, started);
});

browserPairingRoutes.post("/api/integrations/browser/status", async (c) => {
  const body = await readJson(c.req.raw);
  const pairingId = typeof body?.pairingId === "string" ? body.pairingId : "";
  const deviceSecret = typeof body?.deviceSecret === "string" ? body.deviceSecret : "";
  if (!isBrowserPairingId(pairingId) || !deviceSecret) {
    return jsonStatus(400, { error: "Invalid pairing", code: "invalid_pairing" });
  }
  const result = await consumeApprovedPairing(c.env, pairingId, deviceSecret);
  if (!result.ok) {
    return jsonStatus(401, { error: "Unauthorized", code: result.status });
  }
  if (result.status === "approved") {
    return jsonStatus(200, {
      status: "approved",
      token: result.token,
      user: result.user,
      entitlements: result.entitlements,
    });
  }
  return jsonStatus(200, { status: result.status });
});

browserPairingRoutes.post("/api/integrations/browser/cancel", async (c) => {
  const body = await readJson(c.req.raw);
  const pairingId = typeof body?.pairingId === "string" ? body.pairingId : "";
  const deviceSecret = typeof body?.deviceSecret === "string" ? body.deviceSecret : "";
  if (!isBrowserPairingId(pairingId) || !deviceSecret) {
    return jsonStatus(400, { error: "Invalid pairing", code: "invalid_pairing" });
  }
  const row = await loadPairingBySecret(c.env.DB, pairingId, deviceSecret);
  if (!row) return jsonStatus(401, { error: "Unauthorized", code: "unauthorized" });
  const status = await cancelBrowserPairing(c.env.DB, pairingId);
  return jsonStatus(200, { status });
});

browserPairingRoutes.get("/connect/browser/:pairingId", async (c) => {
  const pairingId = c.req.param("pairingId");
  const locale = resolveRequestLocale(c.req.raw);
  if (!isBrowserPairingId(pairingId)) {
    return connectBrowserHtmlResponse({ locale, env: c.env, pairingId, state: "expired" }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) {
    return c.redirect(`/login?next=/connect/browser/${pairingId}`, 302);
  }
  const row = await loadPairingById(c.env.DB, pairingId);
  const now = Math.floor(Date.now() / 1000);
  if (row) await sweepExpiredPairing(c.env.DB, row, now);
  const state = connectPageState(row ? pairingPublicStatus(row, now) : "expired", row?.user_id, session.id);
  const status = state === "expired" || state === "cancelled" || state === "taken" ? 410 : 200;
  return connectBrowserHtmlResponse({ locale, env: c.env, pairingId, state }, status);
});

browserPairingRoutes.post("/connect/browser/:pairingId/approve", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const pairingId = c.req.param("pairingId");
  const locale = resolveRequestLocale(c.req.raw);
  if (!isBrowserPairingId(pairingId)) {
    return connectBrowserHtmlResponse({ locale, env: c.env, pairingId, state: "expired" }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) {
    return c.redirect(`/login?next=/connect/browser/${pairingId}`, 302);
  }
  const row = await loadPairingById(c.env.DB, pairingId);
  const client = (row?.client === "edge-extension" ? "edge-extension" : "chrome-extension") as PairingClient;
  const result = await approveBrowserPairing(c.env.DB, {
    pairingId,
    userId: session.id,
    label: extensionPairingLabel(c.req.header("user-agent") || "", client),
  });
  if (result.ok) {
    track(c.env.ANALYTICS, "integration_connected_extension", { reason: "paired" });
    track(c.env.ANALYTICS, "integration_token_created", { reason: "extension" });
    return c.redirect(`/connect/browser/${pairingId}`, 303);
  }
  const state = connectPageState(result.status === "missing" ? "expired" : result.status, null, session.id);
  return connectBrowserHtmlResponse({ locale, env: c.env, pairingId, state }, 409);
});

browserPairingRoutes.post("/connect/browser/:pairingId/cancel", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const pairingId = c.req.param("pairingId");
  const locale = resolveRequestLocale(c.req.raw);
  if (!isBrowserPairingId(pairingId)) {
    return connectBrowserHtmlResponse({ locale, env: c.env, pairingId, state: "expired" }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) {
    return c.redirect(`/login?next=/connect/browser/${pairingId}`, 302);
  }
  await cancelBrowserPairing(c.env.DB, pairingId);
  return c.redirect(`/connect/browser/${pairingId}`, 303);
});

function connectPageState(
  status: string,
  ownerId: string | null | undefined,
  sessionId: string,
): ConnectBrowserState {
  if (status === "taken") return "taken";
  if (status === "approved" && ownerId && ownerId !== sessionId) return "taken";
  if (status === "approved" || status === "consumed") return "success";
  if (status === "cancelled") return "cancelled";
  if (status === "pending") return "pending";
  return "expired";
}
