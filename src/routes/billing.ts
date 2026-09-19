import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import { resolveSession } from "../lib/auth/session";
import { cookieSecure } from "../lib/auth/crypto";
import {
  attachPaypalSubscriptionId,
  releaseCheckoutReservation,
  reserveCheckout,
} from "../lib/billing/checkout-guard";
import {
  billingConfig,
  billingEnabled,
  billingProductForPriceId,
  cancelSiblingWebAssetsSubscriptions,
  createCheckoutSession,
  createPortalUrl,
  intervalForPrice,
  parsePaypalSubscriptionId,
  planChangeKind,
  priceIdForInterval,
  priceIdForWebAssetsPlan,
  syncSubscriptionFromPaypal,
  upsertSubscriptionFromEvent,
  verifyPaypalWebhook,
  webAssetsBillingConfig,
} from "../lib/billing/paypal";
import type {
  BillingEnv,
  CheckoutInterval,
  PaypalWebhookEvent,
  WebAssetsPaidPlan,
} from "../lib/billing/types";
import { entitlementsFor, flagsFromEnv, loadSubscription } from "../lib/entitlements";
import {
  webAssetsEntitlementsFor,
  webAssetsPlanForPriceId,
} from "../lib/web-assets-entitlements";
import type { WebAssetsPlanId } from "../lib/web-assets-plans";
import { sha256Hex } from "../lib/auth/crypto";
import { localeFromProPath, proPath } from "../../marketing/pro";
import { renderProPage } from "../views/pro";

type Env = {
  Bindings: Cloudflare.Env;
};

export const billingRoutes = new Hono<Env>();

const CHECKOUT_COOKIE = "dropimg_paypal_sub";
const WA_CHECKOUT_COOKIE = "dropimg_paypal_wa_sub";
const CHECKOUT_COOKIE_MAX_AGE = 30 * 60;

function asBillingEnv(env: Cloudflare.Env): BillingEnv {
  return env as Cloudflare.Env & BillingEnv;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(header);
  return m ? decodeURIComponent(m[1]!) : null;
}

function checkoutCookieHeader(
  subscriptionId: string,
  env: { ENVIRONMENT?: string },
  maxAge = CHECKOUT_COOKIE_MAX_AGE,
  name = CHECKOUT_COOKIE,
): string {
  const parts = [
    `${name}=${encodeURIComponent(subscriptionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecure(env)) parts.push("Secure");
  return parts.join("; ");
}

function clearCheckoutCookie(env: { ENVIRONMENT?: string }): string {
  return checkoutCookieHeader("", env, 0);
}

async function servePro(c: { req: { raw: Request; header: (n: string) => string | undefined }; env: Cloudflare.Env }) {
  const url = new URL(c.req.raw.url);
  const pathLocale = localeFromProPath(url.pathname);
  const locale = pathLocale ?? resolveRequestLocale(c.req.raw);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));

  /**
   * PayPal returns here before its webhook. Pull the subscription we minted
   * (cookie) or the id PayPal appends (`subscription_id`) so the first HTML
   * can already be Pro.
   */
  if (session && url.searchParams.get("checkout") === "success") {
    const pending =
      parsePaypalSubscriptionId(url.searchParams.get("subscription_id")) ??
      parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), CHECKOUT_COOKIE));
    if (pending) {
      await syncSubscriptionFromPaypal(asBillingEnv(c.env), c.env.DB, {
        subscriptionId: pending,
        expectedUserId: session.id,
      });
    }
  }

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
  const page = renderProPage({
    locale,
    env: c.env,
    signedIn: Boolean(session),
    plan,
    billingOn: billingEnabled(asBillingEnv(c.env)),
    periodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    show50mb: flagsFromEnv(c.env).pro50mb,
  });
  if (url.searchParams.get("checkout") === "success") {
    page.headers.append("Set-Cookie", clearCheckoutCookie(c.env));
  }
  return page;
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

billingRoutes.get("/api/billing/web-assets/config", (c) => {
  const config = webAssetsBillingConfig(asBillingEnv(c.env));
  if (!config) return c.json({ error: "Billing is not available." }, 404);
  return c.json({ ok: true, mode: config.mode });
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
   * Both legs return to the Pro page: it owns the "activating" status and can
   * wait for the webhook before sending the buyer on to their drops.
   */
  const origin = new URL(c.req.raw.url).origin;
  const returnPath = `${origin}${proPath(resolveRequestLocale(c.req.raw))}`;
  const priceId = priceIdForInterval(config, interval);
  const reserved = await reserveCheckout(asBillingEnv(c.env), c.env.DB, {
    userId: session.id,
    product: "drops_pro",
    priceId,
  });
  if (!reserved.ok) {
    return c.json(reserved.block, 409);
  }
  const created = await createCheckoutSession(asBillingEnv(c.env), {
    userId: session.id,
    email: session.email,
    priceId,
    successUrl: `${returnPath}?checkout=success`,
    cancelUrl: returnPath,
  });
  if (!created.ok) {
    await releaseCheckoutReservation(c.env.DB, reserved.reservationId);
    return c.json({ error: "Checkout isn’t available right now." }, 502);
  }
  await attachPaypalSubscriptionId(
    c.env.DB,
    reserved.reservationId,
    created.data.id,
  );

  track(c.env.ANALYTICS, "checkout_started", {
    reason: interval,
    interval,
    plan: "free",
    client: "web",
  });
  const res = c.json({ url: created.data.url });
  res.headers.append(
    "Set-Cookie",
    checkoutCookieHeader(created.data.id, c.env),
  );
  return res;
});

billingRoutes.post("/api/billing/web-assets/checkout", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const config = webAssetsBillingConfig(asBillingEnv(c.env));
  if (!config) return c.json({ error: "Billing is not available." }, 404);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let interval: CheckoutInterval = "monthly";
  let plan: WebAssetsPaidPlan = "developer";
  try {
    const body = (await c.req.json()) as { interval?: string; plan?: string };
    if (body.interval === "annual") interval = "annual";
    else if (body.interval && body.interval !== "monthly") {
      return c.json({ error: "That billing option isn’t available." }, 400);
    }
    if (body.plan === "pro") plan = "pro";
    else if (body.plan && body.plan !== "developer") {
      return c.json({ error: "That plan isn’t available." }, 400);
    }
  } catch {
    interval = "monthly";
    plan = "developer";
  }

  const origin = new URL(c.req.raw.url).origin;
  const priceId = priceIdForWebAssetsPlan(config, plan, interval);
  const reserved = await reserveCheckout(asBillingEnv(c.env), c.env.DB, {
    userId: session.id,
    product: "web_assets",
    priceId,
  });
  if (!reserved.ok) {
    return c.json(reserved.block, 409);
  }
  const created = await createCheckoutSession(asBillingEnv(c.env), {
    userId: session.id,
    email: session.email,
    priceId,
    successUrl: `${origin}/app/billing?checkout=success&product=web_assets`,
    cancelUrl: `${origin}/pricing`,
  });
  if (!created.ok) {
    await releaseCheckoutReservation(c.env.DB, reserved.reservationId);
    return c.json({ error: "Checkout isn’t available right now." }, 502);
  }
  await attachPaypalSubscriptionId(
    c.env.DB,
    reserved.reservationId,
    created.data.id,
  );

  track(c.env.ANALYTICS, "web_assets_checkout_started", {
    reason: plan,
    interval,
    plan,
    client: "web",
  });
  const res = c.json({ url: created.data.url });
  res.headers.append(
    "Set-Cookie",
    checkoutCookieHeader(created.data.id, c.env, CHECKOUT_COOKIE_MAX_AGE, WA_CHECKOUT_COOKIE),
  );
  return res;
});

billingRoutes.post("/api/billing/sync", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  if (!billingEnabled(asBillingEnv(c.env))) {
    return c.json({ error: "Billing is not available." }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let requested: string | null = null;
  try {
    const body = (await c.req.json()) as { subscription_id?: string };
    requested = parsePaypalSubscriptionId(body.subscription_id);
  } catch {
    requested = null;
  }
  const pending =
    requested ??
    parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), CHECKOUT_COOKIE));
  if (!pending) return c.json({ error: "No checkout to activate." }, 400);

  const synced = await syncSubscriptionFromPaypal(asBillingEnv(c.env), c.env.DB, {
    subscriptionId: pending,
    expectedUserId: session.id,
  });
  if (!synced.ok) {
    return c.json({ error: "Pro is still activating." }, 409);
  }
  const entitlements = await entitlementsFor(c.env, session.id);
  return c.json({ plan: entitlements.plan });
});

billingRoutes.post("/api/billing/web-assets/sync", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  if (!webAssetsBillingConfig(asBillingEnv(c.env))) {
    return c.json({ error: "Billing is not available." }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let requested: string | null = null;
  try {
    const body = (await c.req.json()) as { subscription_id?: string };
    requested = parsePaypalSubscriptionId(body.subscription_id);
  } catch {
    requested = null;
  }
  const pending =
    requested ??
    parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), WA_CHECKOUT_COOKIE));
  if (!pending) return c.json({ error: "No checkout to activate." }, 400);

  const synced = await syncSubscriptionFromPaypal(asBillingEnv(c.env), c.env.DB, {
    subscriptionId: pending,
    expectedUserId: session.id,
  });
  if (!synced.ok) {
    return c.json({ error: "Web Assets is still activating." }, 409);
  }
  await cancelSiblingWebAssetsSubscriptions(
    asBillingEnv(c.env),
    c.env.DB,
    session.id,
    pending,
  );
  const entitlements = await webAssetsEntitlementsFor(c.env, session.id);
  track(c.env.ANALYTICS, "web_assets_checkout_completed", {
    plan: entitlements.plan,
    interval: entitlements.interval ?? undefined,
    client: "web",
  });
  return c.json({ plan: entitlements.plan, interval: entitlements.interval });
});

billingRoutes.post("/api/billing/portal", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  if (!billingEnabled(asBillingEnv(c.env))) {
    return c.json({ error: "Billing is not available." }, 404);
  }
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const row = await c.env.DB.prepare(
    `SELECT provider_subscription_id
     FROM subscriptions
     WHERE user_id = ? AND provider = 'paypal'
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(session.id)
    .first<{ provider_subscription_id: string | null }>();

  if (!row?.provider_subscription_id) {
    return c.json({ error: "No billing account yet." }, 400);
  }
  const url = createPortalUrl(asBillingEnv(c.env));
  if (!url) return c.json({ error: "Could not open billing portal." }, 502);
  return c.json({ url });
});

billingRoutes.post("/api/billing/paypal/webhook", async (c) => {
  const rawBody = await c.req.text();
  if (!rawBody) {
    return c.json({ error: "Missing signature or body" }, 400);
  }

  const verified = await verifyPaypalWebhook(asBillingEnv(c.env), {
    rawBody,
    headers: c.req.raw.headers,
  });
  if (!verified.ok) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  let event: PaypalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaypalWebhookEvent;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!event.id || !event.event_type || !event.resource) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const payloadHash = await sha256Hex(rawBody);
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO billing_events
       (provider, event_id, event_type, received_at, payload_hash, status)
     VALUES ('paypal', ?, ?, ?, ?, 'received')`,
  )
    .bind(event.id, event.event_type, now, payloadHash)
    .run();

  const existing = await c.env.DB.prepare(
    `SELECT status FROM billing_events WHERE provider = 'paypal' AND event_id = ?`,
  )
    .bind(event.id)
    .first<{ status: string }>();
  if (existing?.status === "processed") {
    return c.json({ received: true, duplicate: true });
  }

  await upsertSubscriptionFromEvent(c.env.DB, event, now, asBillingEnv(c.env));
  await c.env.DB.prepare(
    `UPDATE billing_events
     SET status = 'processed', processed_at = ?
     WHERE provider = 'paypal' AND event_id = ?`,
  )
    .bind(now, event.id)
    .run();

  track(c.env.ANALYTICS, "billing_webhook_ok", {
    reason: event.event_type,
  });

  const resource = event.resource;
  const status = typeof resource.status === "string" ? resource.status.toLowerCase() : "";
  const priceId = strFrom(resource.plan_id);
  const interval =
    intervalForPrice(asBillingEnv(c.env), priceId) ?? undefined;
  const waPlan = webAssetsPlanForPriceId(asBillingEnv(c.env), priceId);
  const product = billingProductForPriceId(asBillingEnv(c.env), priceId);
  const userId =
    typeof resource.custom_id === "string"
      ? resource.custom_id
      : typeof resource.custom === "string"
        ? resource.custom
        : null;

  if (
    event.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ||
    event.event_type === "PAYMENT.SALE.DENIED"
  ) {
    track(c.env.ANALYTICS, "billing_payment_failed", {
      reason: event.event_type,
    });
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" && product === "web_assets") {
    const subId = strFrom(resource.id);
    if (userId && subId) {
      const previous = await previousWebAssetsPlan(
        c.env.DB,
        asBillingEnv(c.env),
        userId,
        subId,
      );
      await cancelSiblingWebAssetsSubscriptions(
        asBillingEnv(c.env),
        c.env.DB,
        userId,
        subId,
      );
      const change = planChangeKind(previous, waPlan?.plan ?? "developer");
      track(c.env.ANALYTICS, "web_assets_subscription_activated", {
        reason: event.event_type,
        interval,
        plan: waPlan?.plan ?? "developer",
      });
      if (change === "upgraded") {
        track(c.env.ANALYTICS, "web_assets_plan_upgraded", {
          reason: previous ?? "free",
          interval,
          plan: waPlan?.plan ?? "developer",
        });
      } else if (change === "downgraded") {
        track(c.env.ANALYTICS, "web_assets_plan_downgraded", {
          reason: previous ?? "pro",
          interval,
          plan: waPlan?.plan ?? "developer",
        });
      }
    }
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" && product === "drops_pro") {
    track(c.env.ANALYTICS, "pro_activated", {
      reason: event.event_type,
      interval,
      plan: "pro",
    });
  }
  if (
    event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" ||
    event.event_type === "BILLING.SUBSCRIPTION.EXPIRED" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    if (product === "web_assets") {
      track(c.env.ANALYTICS, "web_assets_subscription_cancelled", {
        reason: event.event_type,
        interval,
        plan: waPlan?.plan ?? "developer",
      });
    } else {
      track(c.env.ANALYTICS, "pro_canceled", {
        reason: event.event_type,
        interval,
        plan: "pro",
      });
    }
  }
  return c.json({ received: true });
});

async function previousWebAssetsPlan(
  db: D1Database,
  env: BillingEnv,
  userId: string,
  keepSubscriptionId: string,
): Promise<WebAssetsPlanId | null> {
  const row = await db
    .prepare(
      `SELECT price_id FROM subscriptions
       WHERE user_id = ?
         AND provider = 'paypal'
         AND product = 'web_assets'
         AND provider_subscription_id != ?
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(userId, keepSubscriptionId)
    .first<{ price_id: string | null }>();
  return webAssetsPlanForPriceId(env, row?.price_id)?.plan ?? null;
}

function strFrom(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
