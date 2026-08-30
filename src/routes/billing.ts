import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import { resolveSession } from "../lib/auth/session";
import {
  billingConfig,
  billingEnabled,
  createPortalUrl,
  priceIdForInterval,
  upsertSubscriptionFromEvent,
} from "../lib/billing/paddle";
import type { BillingEnv, CheckoutInterval, PaddleWebhookEvent } from "../lib/billing/types";
import { verifyPaddleSignature } from "../lib/billing/verify";
import { entitlementsFor, loadSubscription } from "../lib/entitlements";
import { sha256Hex } from "../lib/auth/crypto";
import { localeFromProPath } from "../../marketing/pro";
import { renderProPage } from "../views/pro";

type Env = {
  Bindings: Cloudflare.Env;
};

export const billingRoutes = new Hono<Env>();

function asBillingEnv(env: Cloudflare.Env): BillingEnv {
  return env as Cloudflare.Env & BillingEnv;
}

function intervalFromPrice(
  env: BillingEnv,
  data: Record<string, unknown>,
): "monthly" | "annual" | "" {
  const monthly = env.PADDLE_PRICE_MONTHLY?.trim() || "";
  const annual = env.PADDLE_PRICE_ANNUAL?.trim() || "";
  const ids: string[] = [];
  if (typeof data.price_id === "string") ids.push(data.price_id);
  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { price?: { id?: string }; price_id?: string };
    if (typeof rec.price?.id === "string") ids.push(rec.price.id);
    if (typeof rec.price_id === "string") ids.push(rec.price_id);
  }
  if (annual && ids.includes(annual)) return "annual";
  if (monthly && ids.includes(monthly)) return "monthly";
  return "";
}

async function servePro(c: { req: { raw: Request; header: (n: string) => string | undefined }; env: Cloudflare.Env }) {
  const pathLocale = localeFromProPath(new URL(c.req.raw.url).pathname);
  const locale = pathLocale ?? resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  const entitlements = session
    ? await entitlementsFor(c.env, session.id)
    : null;
  const subscription = session ? await loadSubscription(c.env.DB, session.id) : null;
  const plan = entitlements?.plan ?? "anonymous";
  track(c.env.ANALYTICS, "pro_page_view", {
    plan,
    pageIntent: "pro",
    client: "web",
  });
  return renderProPage({
    locale,
    env: c.env,
    signedIn: Boolean(session),
    plan,
    billingOn: billingEnabled(asBillingEnv(c.env)),
    periodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
  });
}

billingRoutes.get("/pro", (c) => servePro(c));
billingRoutes.get("/es/pro", (c) => servePro(c));
billingRoutes.get("/pt-br/pro", (c) => servePro(c));
billingRoutes.get("/de/pro", (c) => servePro(c));

billingRoutes.get("/api/billing/config", (c) => {
  const config = billingConfig(asBillingEnv(c.env));
  if (!config) return c.json({ error: "Billing is not available." }, 404);
  return c.json(config);
});

billingRoutes.post("/api/billing/checkout", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const config = billingConfig(asBillingEnv(c.env));
  if (!config) return c.json({ error: "Billing is not available." }, 404);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let interval: CheckoutInterval = "monthly";
  try {
    const body = (await c.req.json()) as { interval?: string };
    if (body.interval === "annual") interval = "annual";
    else if (body.interval && body.interval !== "monthly") {
      return c.json({ error: "That billing option isn’t available." }, 400);
    }
  } catch {
    interval = "monthly";
  }

  track(c.env.ANALYTICS, "checkout_started", {
    reason: interval,
    interval,
    plan: "free",
    client: "web",
  });
  return c.json({
    env: config.env,
    clientToken: config.clientToken,
    priceId: priceIdForInterval(config, interval),
    email: session.email,
    customData: { dropimg_user_id: session.id },
  });
});

billingRoutes.post("/api/billing/portal", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  if (!billingEnabled(asBillingEnv(c.env))) {
    return c.json({ error: "Billing is not available." }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const row = await c.env.DB.prepare(
    `SELECT provider_customer_id, provider_subscription_id
     FROM subscriptions
     WHERE user_id = ? AND provider = 'paddle'
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(session.id)
    .first<{ provider_customer_id: string | null; provider_subscription_id: string | null }>();

  if (!row?.provider_customer_id) {
    return c.json({ error: "No billing account yet." }, 400);
  }
  const url = await createPortalUrl(
    asBillingEnv(c.env),
    row.provider_customer_id,
    row.provider_subscription_id ? [row.provider_subscription_id] : [],
  );
  if (!url) return c.json({ error: "Could not open billing portal." }, 502);
  return c.json({ url });
});

billingRoutes.post("/api/billing/paddle/webhook", async (c) => {
  const secret = asBillingEnv(c.env).PADDLE_WEBHOOK_SECRET?.trim() || "";
  const rawBody = await c.req.text();
  const header = c.req.header("paddle-signature");
  if (!secret || !rawBody || !header) {
    return c.json({ error: "Missing signature or body" }, 400);
  }

  const verified = await verifyPaddleSignature({ rawBody, header, secret });
  if (!verified.ok) {
    return c.json({ error: "Invalid signature" }, 500);
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!event.event_id || !event.event_type || !event.data) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const payloadHash = await sha256Hex(rawBody);
  const inserted = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO billing_events
       (provider, event_id, event_type, received_at, payload_hash, status)
     VALUES ('paddle', ?, ?, ?, ?, 'received')`,
  )
    .bind(event.event_id, event.event_type, now, payloadHash)
    .run();

  const existing = await c.env.DB.prepare(
    `SELECT status FROM billing_events WHERE provider = 'paddle' AND event_id = ?`,
  )
    .bind(event.event_id)
    .first<{ status: string }>();
  if (existing?.status === "processed") {
    return c.json({ received: true, duplicate: true });
  }

  const handled = await upsertSubscriptionFromEvent(c.env.DB, event, now);
  await c.env.DB.prepare(
    `UPDATE billing_events
     SET status = 'processed', processed_at = ?
     WHERE provider = 'paddle' AND event_id = ?`,
  )
    .bind(now, event.event_id)
    .run();
  track(c.env.ANALYTICS, "billing_webhook_ok", {
    reason: event.event_type,
  });
  const status = typeof event.data.status === "string" ? event.data.status : "";
  const interval = intervalFromPrice(asBillingEnv(c.env), event.data);
  if (
    event.event_type === "subscription.activated" ||
    event.event_type === "subscription.created" ||
    (event.event_type === "transaction.completed" && status === "completed")
  ) {
    track(c.env.ANALYTICS, "pro_activated", {
      reason: event.event_type,
      interval: interval || undefined,
      plan: "pro",
    });
  }
  if (event.event_type === "subscription.canceled" || status === "canceled") {
    track(c.env.ANALYTICS, "pro_canceled", {
      reason: event.event_type,
      interval: interval || undefined,
      plan: "pro",
    });
  }
  void inserted;
  return c.json({ received: true });
});
