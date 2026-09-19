import { Hono } from "hono";
import { track } from "../lib/analytics";
import { csrfOriginOk } from "../lib/auth/csrf";
import { resolveRequestLocale } from "../lib/auth/locale-cookie";
import { resolveSession } from "../lib/auth/session";
import { cookieSecure } from "../lib/auth/crypto";
import {
  abandonPendingCheckout,
  attachPaypalSubscriptionId,
  releaseCheckoutReservation,
  reserveCheckout,
} from "../lib/billing/checkout-guard";
import { billingLog } from "../lib/billing/log";
import { maybeSendDunningEmail, maybeSendReceiptEmail } from "../lib/billing/notifications";
import { recordPaymentFromSaleEvent } from "../lib/billing/payments";
import { getSubscriptionEntitlementState } from "../lib/billing/lifecycle";
import {
  loadOwnedSubscription,
  persistPendingRevision,
  previewPlanChange,
  resolvePlanChangeTarget,
} from "../lib/billing/revision";
import {
  billingConfig,
  billingEnabled,
  billingProductForPriceId,
  cancelPaypalSubscriptionImmediately,
  cancelSiblingWebAssetsSubscriptions,
  createCheckoutSession,
  createPortalUrl,
  intervalForPrice,
  parsePaypalSubscriptionId,
  planChangeKind,
  priceIdForInterval,
  priceIdForWebAssetsPlan,
  revisePaypalSubscription,
  syncSubscriptionFromPaypal,
  upsertSubscriptionFromEvent,
  verifyPaypalWebhook,
  webAssetsBillingConfig,
} from "../lib/billing/paypal";
import type {
  BillingEnv,
  BillingProduct,
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
import type { Locale } from "../../marketing/locales";
import { localeFromProPath, proPath } from "../../marketing/pro";
import { renderProPage } from "../views/pro";

type Env = {
  Bindings: Cloudflare.Env;
};

export const billingRoutes = new Hono<Env>();

const CHECKOUT_COOKIE = "dropimg_paypal_sub";
const WA_CHECKOUT_COOKIE = "dropimg_paypal_wa_sub";
const REVISE_COOKIE = "dropimg_paypal_revise";
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

function appendClearedCheckoutCookies(headers: Headers, env: { ENVIRONMENT?: string }) {
  headers.append("Set-Cookie", checkoutCookieHeader("", env, 0, CHECKOUT_COOKIE));
  headers.append("Set-Cookie", checkoutCookieHeader("", env, 0, WA_CHECKOUT_COOKIE));
}

function paypalCheckoutCancelUrl(origin: string, product: BillingProduct): string {
  return `${origin}/api/billing/checkout/cancelled?product=${product}`;
}

function paypalCheckoutCancelNext(
  origin: string,
  product: BillingProduct,
  locale: Locale,
): string {
  if (product === "web_assets") return `${origin}/pricing?checkout=cancelled`;
  return `${origin}${proPath(locale)}?checkout=cancelled`;
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

billingRoutes.get("/api/billing/checkout/cancelled", async (c) => {
  const product = parseProduct(c.req.query("product")) ?? "web_assets";
  const origin = new URL(c.req.raw.url).origin;
  const locale = resolveRequestLocale(c.req.raw);
  const next = paypalCheckoutCancelNext(origin, product, locale);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (session) {
    await abandonPendingCheckout(asBillingEnv(c.env), c.env.DB, {
      userId: session.id,
      product,
    });
  }
  const res = c.redirect(next, 302);
  appendClearedCheckoutCookies(res.headers, c.env);
  return res;
});

billingRoutes.post("/api/billing/checkout/abandon", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let product: BillingProduct | null = null;
  try {
    const body = (await c.req.json()) as { product?: string };
    product = parseProduct(body.product);
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!product) return c.json({ error: "That plan isn’t available." }, 400);

  await abandonPendingCheckout(asBillingEnv(c.env), c.env.DB, {
    userId: session.id,
    product,
  });
  const res = c.json({ ok: true });
  appendClearedCheckoutCookies(res.headers, c.env);
  return res;
});

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
    cancelUrl: paypalCheckoutCancelUrl(origin, "drops_pro"),
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
    cancelUrl: paypalCheckoutCancelUrl(origin, "web_assets"),
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
    parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), CHECKOUT_COOKIE)) ??
    parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), REVISE_COOKIE));
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
    parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), WA_CHECKOUT_COOKIE)) ??
    parsePaypalSubscriptionId(readCookie(c.req.header("cookie"), REVISE_COOKIE));
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

function parseProduct(value: unknown): BillingProduct | null {
  if (value === "web_assets" || value === "drops_pro") return value;
  return null;
}

billingRoutes.post("/api/billing/revise", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let product: BillingProduct | null = null;
  let plan: string | undefined;
  let interval: string | undefined;
  try {
    const body = (await c.req.json()) as { product?: string; plan?: string; interval?: string };
    product = parseProduct(body.product);
    plan = body.plan;
    interval = body.interval;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!product) return c.json({ error: "That plan isn’t available." }, 400);

  const env = asBillingEnv(c.env);
  const target = resolvePlanChangeTarget(env, product, { plan, interval });
  if ("error" in target) return c.json({ error: target.error }, 400);

  const row = await loadOwnedSubscription(c.env.DB, session.id, product);
  if (!row?.provider_subscription_id) {
    return c.json({ error: "No billing account yet." }, 400);
  }
  const paypalId = parsePaypalSubscriptionId(row.provider_subscription_id);
  if (!paypalId) return c.json({ error: "No billing account yet." }, 400);

  const preview = previewPlanChange(env, row, target);
  if ("error" in preview) {
    return c.json({ error: preview.error, code: preview.code }, 409);
  }

  const origin = new URL(c.req.raw.url).origin;
  const returnPath = `${origin}/app/billing`;
  const revised = await revisePaypalSubscription(env, {
    subscriptionId: paypalId,
    planId: target.priceId,
    successUrl: `${returnPath}?revise=success&product=${product}`,
    cancelUrl: returnPath,
  });
  if (!revised.ok) {
    billingLog("revision", {
      userId: session.id,
      subscriptionId: paypalId,
      product,
      planId: target.priceId,
      result: revised.error,
    });
    return c.json({ error: "Could not start that plan change." }, 502);
  }

  await persistPendingRevision(c.env.DB, {
    subscriptionId: paypalId,
    pendingPriceId: target.priceId,
    pendingEffectiveAt: preview.effectiveAt,
    now: Math.floor(Date.now() / 1000),
  });
  billingLog("revision", {
    userId: session.id,
    subscriptionId: paypalId,
    product,
    planId: target.priceId,
    result: revised.data.approveUrl ? "approval_required" : "scheduled",
  });
  track(c.env.ANALYTICS, "billing_revision_started", {
    plan: target.plan,
    interval: target.interval,
    client: "web",
  });

  const res = c.json({
    url: revised.data.approveUrl,
    preview: {
      current: preview.currentLabel,
      next: preview.nextLabel,
      effectiveAt: preview.effectiveAt,
      nextCharge: preview.nextCharge,
      proratedToday: false,
    },
  });
  if (revised.data.approveUrl) {
    res.headers.append(
      "Set-Cookie",
      checkoutCookieHeader(paypalId, c.env, CHECKOUT_COOKIE_MAX_AGE, REVISE_COOKIE),
    );
  }
  return res;
});

billingRoutes.post("/api/billing/cancel", async (c) => {
  if (!csrfOriginOk(c.req.raw)) return c.json({ error: "Invalid origin" }, 403);
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let product: BillingProduct | null = null;
  try {
    const body = (await c.req.json()) as { product?: string };
    product = parseProduct(body.product);
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!product) return c.json({ error: "That plan isn’t available." }, 400);

  const row = await loadOwnedSubscription(c.env.DB, session.id, product);
  const life = getSubscriptionEntitlementState(row);
  if (life.state === "canceled_paid_through" || life.state === "canceled") {
    return c.json({ ok: true, periodEnd: row?.current_period_end ?? null });
  }
  if (!row?.provider_subscription_id || !life.cancelAllowed) {
    return c.json({ error: "This subscription cannot be canceled right now." }, 409);
  }
  const paypalId = parsePaypalSubscriptionId(row.provider_subscription_id);
  if (!paypalId) return c.json({ error: "This subscription cannot be canceled right now." }, 409);

  const now = Math.floor(Date.now() / 1000);
  const canceled = await cancelPaypalSubscriptionImmediately(
    asBillingEnv(c.env),
    paypalId,
    fetch,
    "Canceled renewal from DropIMG billing",
  );
  if (!canceled.ok) {
    billingLog("cancel", {
      userId: session.id,
      subscriptionId: paypalId,
      product,
      result: canceled.error,
    });
    return c.json({ error: "Could not cancel renewal." }, 502);
  }

  await c.env.DB.prepare(
    `UPDATE subscriptions
     SET status = 'canceled',
         cancel_at_period_end = 1,
         pending_price_id = NULL,
         pending_effective_at = NULL,
         updated_at = ?
     WHERE provider_subscription_id = ? AND user_id = ?`,
  )
    .bind(now, paypalId, session.id)
    .run();

  billingLog("cancel", {
    userId: session.id,
    subscriptionId: paypalId,
    product,
    result: "canceled",
  });
  track(c.env.ANALYTICS, "billing_cancel_requested", {
    plan: product === "web_assets" ? "developer" : "pro",
    client: "web",
  });
  return c.json({ ok: true, periodEnd: row.current_period_end });
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

  const resource = event.resource;
  const subId = event.event_type.startsWith("PAYMENT.SALE.")
    ? strFrom(resource.billing_agreement_id) || strFrom(resource.id)
    : strFrom(resource.id) || strFrom(resource.billing_agreement_id);
  const previous = subId
    ? await c.env.DB.prepare(
        `SELECT status, user_id, product, price_id FROM subscriptions
         WHERE provider_subscription_id = ? LIMIT 1`,
      )
        .bind(subId)
        .first<{ status: string; user_id: string; product: BillingProduct; price_id: string | null }>()
    : null;

  const upserted = await upsertSubscriptionFromEvent(c.env.DB, event, now, asBillingEnv(c.env));
  if (
    event.event_type.startsWith("PAYMENT.SALE.") ||
    event.event_type.endsWith("PAYMENT.FAILED")
  ) {
    await recordPaymentFromSaleEvent(c.env.DB, asBillingEnv(c.env), {
      eventId: event.id,
      eventType: event.event_type,
      resource,
      userId: upserted.userId || previous?.user_id || null,
      subscriptionId: upserted.subscriptionId || subId,
      now,
    });
  }

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

  const status = typeof resource.status === "string" ? resource.status.toLowerCase() : "";
  const priceId = strFrom(resource.plan_id) || upserted.priceId;
  const interval =
    intervalForPrice(asBillingEnv(c.env), priceId) ?? undefined;
  const waPlan = webAssetsPlanForPriceId(asBillingEnv(c.env), priceId);
  const product = upserted.product || billingProductForPriceId(asBillingEnv(c.env), priceId);
  const userId = upserted.userId || previous?.user_id || strFrom(resource.custom_id) || strFrom(resource.custom);
  const manageUrl = createPortalUrl(asBillingEnv(c.env)) || "https://www.paypal.com/myaccount/autopay";
  const mappedStatus = upserted.status?.toLowerCase() || status;
  const saleTxnId = strFrom(resource.id) || strFrom(resource.sale_id);

  billingLog("webhook", {
    userId,
    subscriptionId: upserted.subscriptionId || subId,
    product,
    planId: priceId,
    eventId: event.id,
    transition: event.event_type,
    result: mappedStatus,
  });

  if (event.event_type === "PAYMENT.SALE.COMPLETED") {
    await maybeSendReceiptEmail(c.env, c.env.DB, {
      eventId: event.id,
      kind: "paid",
      userId,
      subscriptionId: upserted.subscriptionId || subId,
      transactionId: saleTxnId,
      now,
    });
  }

  if (event.event_type === "PAYMENT.SALE.REFUNDED") {
    await maybeSendReceiptEmail(c.env, c.env.DB, {
      eventId: event.id,
      kind: "refunded",
      userId,
      subscriptionId: upserted.subscriptionId || subId,
      transactionId: saleTxnId,
      now,
    });
  }

  if (
    event.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ||
    event.event_type === "PAYMENT.SALE.DENIED"
  ) {
    track(c.env.ANALYTICS, "billing_payment_failed", {
      reason: event.event_type,
    });
    await maybeSendDunningEmail(c.env, c.env.DB, {
      eventId: event.id,
      type: "payment_failed",
      userId,
      subscriptionId: upserted.subscriptionId || subId,
      product,
      planId: priceId,
      manageUrl,
      now,
    });
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED" || mappedStatus === "suspended") {
    if (event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED") {
      track(c.env.ANALYTICS, "billing_subscription_suspended", {
        reason: event.event_type,
      });
      await maybeSendDunningEmail(c.env, c.env.DB, {
        eventId: event.id,
        type: "subscription_suspended",
        userId,
        subscriptionId: upserted.subscriptionId || subId,
        product,
        planId: priceId,
        manageUrl,
        now,
      });
    }
  }

  if (
    previous?.status === "suspended" &&
    mappedStatus === "active" &&
    (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" ||
      event.event_type === "BILLING.SUBSCRIPTION.UPDATED")
  ) {
    await maybeSendDunningEmail(c.env, c.env.DB, {
      eventId: event.id,
      type: "payment_recovered",
      userId,
      subscriptionId: upserted.subscriptionId || subId,
      product,
      planId: priceId,
      manageUrl,
      now,
    });
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.EXPIRED") {
    await maybeSendDunningEmail(c.env, c.env.DB, {
      eventId: event.id,
      type: "subscription_ended",
      userId,
      subscriptionId: upserted.subscriptionId || subId,
      product,
      planId: priceId,
      manageUrl,
      now,
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
