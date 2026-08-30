import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import { resolveSession } from "../lib/auth/session";
import {
  billingConfig,
  billingEnabled,
  createCheckoutSession,
  createPortalUrl,
  intervalForPrice,
  priceIdForInterval,
  upsertSubscriptionFromEvent,
} from "../lib/billing/stripe";
import type {
  BillingEnv,
  CheckoutInterval,
  StripeWebhookEvent,
} from "../lib/billing/types";
import { verifyStripeSignature } from "../lib/billing/verify";
import { entitlementsFor, loadSubscription } from "../lib/entitlements";
import { sha256Hex } from "../lib/auth/crypto";
import { localeFromProPath, proPath } from "../../marketing/pro";
import { renderProPage } from "../views/pro";

type Env = {
  Bindings: Cloudflare.Env;
};

export const billingRoutes = new Hono<Env>();

function asBillingEnv(env: Cloudflare.Env): BillingEnv {
  return env as Cloudflare.Env & BillingEnv;
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

  /**
   * Reuse the Stripe customer a previous subscription created, so a returning
   * subscriber keeps one billing history instead of collecting duplicates.
   */
  const known = await c.env.DB.prepare(
    `SELECT provider_customer_id FROM subscriptions
     WHERE user_id = ? AND provider = 'stripe' AND provider_customer_id IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(session.id)
    .first<{ provider_customer_id: string | null }>();

  /**
   * Both legs return to the Pro page: it owns the "activating" status and can
   * wait for the webhook before sending the buyer on to their drops.
   */
  const origin = new URL(c.req.raw.url).origin;
  const returnPath = `${origin}${proPath(resolveRequestLocale(c.req.raw))}`;
  const created = await createCheckoutSession(asBillingEnv(c.env), {
    userId: session.id,
    email: session.email,
    priceId: priceIdForInterval(config, interval),
    successUrl: `${returnPath}?checkout=success`,
    cancelUrl: returnPath,
    customerId: known?.provider_customer_id ?? null,
  });
  if (!created.ok) {
    return c.json({ error: "Checkout isn’t available right now." }, 502);
  }

  track(c.env.ANALYTICS, "checkout_started", {
    reason: interval,
    interval,
    plan: "free",
    client: "web",
  });
  return c.json({ url: created.data.url });
});

billingRoutes.post("/api/billing/portal", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  if (!billingEnabled(asBillingEnv(c.env))) {
    return c.json({ error: "Billing is not available." }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const row = await c.env.DB.prepare(
    `SELECT provider_customer_id
     FROM subscriptions
     WHERE user_id = ? AND provider = 'stripe'
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(session.id)
    .first<{ provider_customer_id: string | null }>();

  if (!row?.provider_customer_id) {
    return c.json({ error: "No billing account yet." }, 400);
  }
  const origin = new URL(c.req.raw.url).origin;
  const url = await createPortalUrl(
    asBillingEnv(c.env),
    row.provider_customer_id,
    `${origin}/account`,
  );
  if (!url) return c.json({ error: "Could not open billing portal." }, 502);
  return c.json({ url });
});

billingRoutes.post("/api/billing/stripe/webhook", async (c) => {
  const secret = asBillingEnv(c.env).STRIPE_WEBHOOK_SECRET?.trim() || "";
  const rawBody = await c.req.text();
  const header = c.req.header("stripe-signature");
  if (!secret || !rawBody || !header) {
    return c.json({ error: "Missing signature or body" }, 400);
  }

  const verified = await verifyStripeSignature({ rawBody, header, secret });
  if (!verified.ok) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!event.id || !event.type || !event.data?.object) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const payloadHash = await sha256Hex(rawBody);
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO billing_events
       (provider, event_id, event_type, received_at, payload_hash, status)
     VALUES ('stripe', ?, ?, ?, ?, 'received')`,
  )
    .bind(event.id, event.type, now, payloadHash)
    .run();

  const existing = await c.env.DB.prepare(
    `SELECT status FROM billing_events WHERE provider = 'stripe' AND event_id = ?`,
  )
    .bind(event.id)
    .first<{ status: string }>();
  if (existing?.status === "processed") {
    return c.json({ received: true, duplicate: true });
  }

  await upsertSubscriptionFromEvent(c.env.DB, event, now);
  await c.env.DB.prepare(
    `UPDATE billing_events
     SET status = 'processed', processed_at = ?
     WHERE provider = 'stripe' AND event_id = ?`,
  )
    .bind(now, event.id)
    .run();

  track(c.env.ANALYTICS, "billing_webhook_ok", {
    reason: event.type,
  });

  const object = event.data.object;
  const status = typeof object.status === "string" ? object.status : "";
  const interval =
    intervalForPrice(asBillingEnv(c.env), priceIdFromObject(object)) ?? undefined;
  if (
    event.type === "checkout.session.completed" ||
    (event.type === "customer.subscription.created" && status === "active")
  ) {
    track(c.env.ANALYTICS, "pro_activated", {
      reason: event.type,
      interval,
      plan: "pro",
    });
  }
  if (event.type === "customer.subscription.deleted" || status === "canceled") {
    track(c.env.ANALYTICS, "pro_canceled", {
      reason: event.type,
      interval,
      plan: "pro",
    });
  }
  return c.json({ received: true });
});

function priceIdFromObject(object: Record<string, unknown>): string | null {
  const items = object.items as { data?: unknown[] } | undefined;
  for (const item of items?.data ?? []) {
    if (!item || typeof item !== "object") continue;
    const price = (item as { price?: unknown }).price;
    if (typeof price === "string") return price;
    if (price && typeof price === "object") {
      const id = (price as { id?: unknown }).id;
      if (typeof id === "string") return id;
    }
  }
  return null;
}
