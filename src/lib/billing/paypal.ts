import type {
  BillingConfig,
  BillingEnv,
  CheckoutInterval,
  PaypalMode,
  PaypalWebhookEvent,
} from "./types";
import { verifyHmacSignature } from "./verify";

const SANDBOX_API = "https://api-m.sandbox.paypal.com";
const LIVE_API = "https://api-m.paypal.com";
const SANDBOX_WALLET = "https://www.sandbox.paypal.com/myaccount/autopay";
const LIVE_WALLET = "https://www.paypal.com/myaccount/autopay";

export function billingEnabled(env: BillingEnv): boolean {
  return env.BILLING_ENABLED === "true";
}

/**
 * Sandbox and live are distinguished by PAYPAL_ENV, which also picks the API
 * host, so the two can never disagree. Anything else disables billing instead
 * of guessing which account would have been charged.
 */
export function paypalMode(env: BillingEnv): PaypalMode | null {
  const value = env.PAYPAL_ENV?.trim().toLowerCase() ?? "";
  if (value === "sandbox") return "test";
  if (value === "live") return "live";
  return null;
}

export function paypalApiBase(env: BillingEnv): string | null {
  const mode = paypalMode(env);
  if (mode === "test") return SANDBOX_API;
  if (mode === "live") return LIVE_API;
  return null;
}

export function billingConfig(env: BillingEnv): BillingConfig | null {
  if (!billingEnabled(env)) return null;
  const mode = paypalMode(env);
  if (!mode) return null;
  if (!env.PAYPAL_CLIENT_ID?.trim() || !env.PAYPAL_CLIENT_SECRET?.trim()) {
    return null;
  }
  const priceMonthly = env.PAYPAL_PLAN_MONTHLY?.trim() || "";
  const priceAnnual = env.PAYPAL_PLAN_ANNUAL?.trim() || "";
  if (!priceMonthly || !priceAnnual) return null;
  return { mode, priceMonthly, priceAnnual };
}

export function priceIdForInterval(
  config: BillingConfig,
  interval: CheckoutInterval,
): string {
  return interval === "annual" ? config.priceAnnual : config.priceMonthly;
}

export function intervalForPrice(
  env: BillingEnv,
  priceId: string | null | undefined,
): CheckoutInterval | null {
  const id = priceId?.trim();
  if (!id) return null;
  if (id === env.PAYPAL_PLAN_ANNUAL?.trim()) return "annual";
  if (id === env.PAYPAL_PLAN_MONTHLY?.trim()) return "monthly";
  return null;
}

type PaypalResult<T> = { ok: true; data: T } | { ok: false; error: string };

type TokenCache = { token: string; expiresAt: number; key: string };
let tokenCache: TokenCache | null = null;

function basicAuth(clientId: string, secret: string): string {
  const raw = `${clientId}:${secret}`;
  const bytes = new TextEncoder().encode(raw);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function getAccessToken(
  env: BillingEnv,
  fetchImpl: typeof fetch = fetch,
  nowMs = Date.now(),
): Promise<PaypalResult<string>> {
  const clientId = env.PAYPAL_CLIENT_ID?.trim() ?? "";
  const secret = env.PAYPAL_CLIENT_SECRET?.trim() ?? "";
  const base = paypalApiBase(env);
  if (!clientId || !secret || !base) {
    return { ok: false, error: "paypal_unconfigured" };
  }

  const cacheKey = `${base}:${clientId}`;
  if (
    tokenCache &&
    tokenCache.key === cacheKey &&
    tokenCache.expiresAt > nowMs + 60_000
  ) {
    return { ok: true, data: tokenCache.token };
  }

  const res = await fetchImpl(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;
  const token = body?.access_token?.trim();
  if (!res.ok || !token) {
    return {
      ok: false,
      error: body?.error || body?.error_description || "paypal_token_error",
    };
  }
  const ttlSec =
    typeof body.expires_in === "number" && body.expires_in > 0
      ? body.expires_in
      : 300;
  tokenCache = {
    token,
    key: cacheKey,
    expiresAt: nowMs + ttlSec * 1000,
  };
  return { ok: true, data: token };
}

async function paypalRequest<T>(
  env: BillingEnv,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<PaypalResult<T>> {
  const base = paypalApiBase(env);
  const token = await getAccessToken(env, fetchImpl);
  if (!base) return { ok: false, error: "paypal_unconfigured" };
  if (!token.ok) return token;

  const res = await fetchImpl(`${base}${path}`, {
    method: init.method ?? "POST",
    headers: {
      Authorization: `Bearer ${token.data}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (res.status === 204) {
    return { ok: true, data: {} as T };
  }

  const body = (await res.json().catch(() => null)) as
    | (T & {
        name?: string;
        message?: string;
        details?: { issue?: string }[];
      })
    | null;
  if (!res.ok) {
    const issue = body?.details?.[0]?.issue || body?.name || body?.message;
    return { ok: false, error: issue || "paypal_error" };
  }
  return { ok: true, data: (body ?? {}) as T };
}

type PaypalLink = { rel?: string; href?: string };

export async function createCheckoutSession(
  env: BillingEnv,
  opts: {
    userId: string;
    email: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    customerId?: string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<PaypalResult<{ id: string; url: string }>> {
  const body: Record<string, unknown> = {
    plan_id: opts.priceId,
    custom_id: opts.userId,
    application_context: {
      brand_name: "DropIMG",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      return_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    },
  };
  if (opts.email) {
    body.subscriber = { email_address: opts.email };
  }

  const res = await paypalRequest<{ id?: string; links?: PaypalLink[] }>(
    env,
    "/v1/billing/subscriptions",
    { body },
    fetchImpl,
  );
  if (!res.ok) return res;
  const id = res.data.id?.trim();
  const url = res.data.links?.find((l) => l.rel === "approve")?.href?.trim();
  if (!id || !url) return { ok: false, error: "paypal_no_approval_url" };
  return { ok: true, data: { id, url } };
}

/** PayPal has no Customer Portal; send the buyer to their wallet. */
export function createPortalUrl(env: BillingEnv): string | null {
  const mode = paypalMode(env);
  if (mode === "test") return SANDBOX_WALLET;
  if (mode === "live") return LIVE_WALLET;
  return null;
}

export async function cancelPaypalSubscriptionImmediately(
  env: BillingEnv,
  subscriptionId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await paypalRequest<{ id?: string }>(
    env,
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { method: "POST", body: { reason: "DropIMG account deleted" } },
    fetchImpl,
  );
  if (res.ok) return { ok: true };
  /** Already gone is the state we wanted, not a failure to reach it. */
  if (
    res.error === "RESOURCE_NOT_FOUND" ||
    res.error === "SUBSCRIPTION_STATUS_INVALID"
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    error:
      res.error === "paypal_unconfigured"
        ? "paypal_unconfigured"
        : "paypal_cancel_failed",
  };
}

/** Statuses worth cancelling before we delete an account. */
export const LIVE_PAYPAL_STATUSES = new Set([
  "active",
  "approved",
  "past_due",
  "suspended",
]);

export function isLivePaypalStatus(status: string | null | undefined): boolean {
  return LIVE_PAYPAL_STATUSES.has((status ?? "").trim().toLowerCase());
}

const PAYPAL_SUBSCRIPTION_ID = /^I-[A-Za-z0-9]+$/;

export function parsePaypalSubscriptionId(
  value: string | null | undefined,
): string | null {
  const id = value?.trim() ?? "";
  return PAYPAL_SUBSCRIPTION_ID.test(id) ? id : null;
}

/**
 * PayPal sends the buyer back before the webhook. Pull the subscription we
 * just created and upsert it so /pro can render Pro on the first paint.
 * `expectedUserId` must match `custom_id` — a guessed I-… cannot grant Pro.
 */
export async function syncSubscriptionFromPaypal(
  env: BillingEnv,
  db: D1Database,
  opts: { subscriptionId: string; expectedUserId: string },
  fetchImpl: typeof fetch = fetch,
  now = Math.floor(Date.now() / 1000),
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const subscriptionId = parsePaypalSubscriptionId(opts.subscriptionId);
  if (!subscriptionId) return { ok: false, error: "invalid_id" };

  const res = await paypalRequest<Record<string, unknown>>(
    env,
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "GET" },
    fetchImpl,
  );
  if (!res.ok) return { ok: false, error: res.error };

  const resource = res.data;
  const owner = customUserId(resource);
  if (!owner || owner !== opts.expectedUserId) {
    return { ok: false, error: "user_mismatch" };
  }

  const rawStatus = str(resource.status);
  const status = mapPaypalStatus(rawStatus, "BILLING.SUBSCRIPTION.UPDATED");
  if (status !== "active") {
    return { ok: false, error: "not_active" };
  }

  await upsertSubscriptionFromEvent(
    db,
    {
      id: `sync:${subscriptionId}`,
      event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
      create_time: str(resource.update_time) || str(resource.create_time) || undefined,
      resource,
    },
    now,
  );
  return { ok: true, status };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unixFromIso(value: unknown): number | null {
  const raw = str(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function mapPaypalStatus(raw: string | null, eventType: string): string {
  if (
    eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
    eventType === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    return "canceled";
  }
  const status = (raw ?? "").trim().toUpperCase();
  if (status === "ACTIVE" || status === "APPROVED") return "active";
  if (status === "SUSPENDED") return "suspended";
  if (status === "CANCELLED" || status === "EXPIRED") return "canceled";
  return status.toLowerCase() || "unknown";
}

function subscriberId(resource: Record<string, unknown>): string | null {
  const subscriber = asRecord(resource.subscriber);
  return (
    str(subscriber?.payer_id) ||
    str(asRecord(subscriber?.payer_info)?.payer_id) ||
    str(resource.billing_agreement_id)
  );
}

function customUserId(resource: Record<string, unknown>): string | null {
  return str(resource.custom_id) || str(resource.custom);
}

function periodEndOf(resource: Record<string, unknown>): number | null {
  const info = asRecord(resource.billing_info);
  return unixFromIso(info?.next_billing_time) ?? unixFromIso(resource.next_billing_time);
}

export async function verifyPaypalWebhook(
  env: BillingEnv,
  opts: {
    rawBody: string;
    headers: Headers;
    nowSeconds?: number;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hmacHeader =
    opts.headers.get("paypal-signature") || opts.headers.get("PayPal-Signature");
  const hmacSecret = env.PAYPAL_WEBHOOK_SECRET?.trim() ?? "";
  /**
   * Tests sign with `t=,v1=`. Production PayPal sends transmission headers
   * instead, so a leftover local HMAC secret cannot bypass live verify.
   */
  if (hmacSecret && hmacHeader?.includes("v1=")) {
    const verified = await verifyHmacSignature({
      rawBody: opts.rawBody,
      header: hmacHeader,
      secret: hmacSecret,
      nowSeconds: opts.nowSeconds,
    });
    return verified.ok ? { ok: true } : { ok: false, error: verified.error };
  }

  const webhookId = env.PAYPAL_WEBHOOK_ID?.trim() ?? "";
  if (webhookId) {
    const transmissionId = opts.headers.get("paypal-transmission-id")?.trim() ?? "";
    const transmissionTime = opts.headers.get("paypal-transmission-time")?.trim() ?? "";
    const transmissionSig = opts.headers.get("paypal-transmission-sig")?.trim() ?? "";
    const certUrl = opts.headers.get("paypal-cert-url")?.trim() ?? "";
    const authAlgo = opts.headers.get("paypal-auth-algo")?.trim() ?? "";
    if (
      !transmissionId ||
      !transmissionTime ||
      !transmissionSig ||
      !certUrl ||
      !authAlgo ||
      !opts.rawBody
    ) {
      return { ok: false, error: "missing" };
    }
    let webhookEvent: unknown;
    try {
      webhookEvent = JSON.parse(opts.rawBody);
    } catch {
      return { ok: false, error: "malformed" };
    }
    const res = await paypalRequest<{ verification_status?: string }>(
      env,
      "/v1/notifications/verify-webhook-signature",
      {
        body: {
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        },
      },
      fetchImpl,
    );
    if (!res.ok) return { ok: false, error: res.error };
    if (res.data.verification_status !== "SUCCESS") {
      return { ok: false, error: "mismatch" };
    }
    return { ok: true };
  }

  return { ok: false, error: "missing" };
}

export async function upsertSubscriptionFromEvent(
  db: D1Database,
  event: PaypalWebhookEvent,
  now = Math.floor(Date.now() / 1000),
): Promise<{ userId: string | null; subscriptionId: string | null }> {
  const resource = event.resource ?? {};
  const occurredAt = unixFromIso(event.create_time) ?? now;
  const eventType = event.event_type;

  if (eventType.startsWith("BILLING.SUBSCRIPTION.")) {
    const subscriptionId = str(resource.id);
    if (!subscriptionId) return { userId: null, subscriptionId: null };
    const customerId = subscriberId(resource);
    const status = mapPaypalStatus(str(resource.status), eventType);

    let userId = customUserId(resource);
    if (!userId) {
      const existing = await db
        .prepare(
          `SELECT user_id FROM subscriptions
           WHERE provider_subscription_id = ? OR provider_customer_id = ?
           LIMIT 1`,
        )
        .bind(subscriptionId, customerId ?? "")
        .first<{ user_id: string }>();
      userId = existing?.user_id ?? null;
    }
    if (!userId) return { userId: null, subscriptionId };

    await applySubscriptionState(db, {
      userId,
      customerId,
      subscriptionId,
      status,
      priceId: str(resource.plan_id),
      periodEnd: periodEndOf(resource),
      cancelAtPeriodEnd: status === "canceled" ? 1 : 0,
      occurredAt,
      now,
      authoritative: true,
    });
    return { userId, subscriptionId };
  }

  if (eventType === "PAYMENT.SALE.COMPLETED") {
    const subscriptionId = str(resource.billing_agreement_id);
    const customerId = str(asRecord(resource.payer)?.payer_id) || subscriberId(resource);
    let userId = customUserId(resource);
    if (!userId && subscriptionId) {
      const existing = await db
        .prepare(
          `SELECT user_id FROM subscriptions
           WHERE provider_subscription_id = ?
           LIMIT 1`,
        )
        .bind(subscriptionId)
        .first<{ user_id: string }>();
      userId = existing?.user_id ?? null;
    }
    if (!userId || !subscriptionId) return { userId, subscriptionId };

    /**
     * A sale names who paid but not the billing period, so it only
     * establishes the link and never overwrites a status the subscription
     * events have already settled.
     */
    await applySubscriptionState(db, {
      userId,
      customerId,
      subscriptionId,
      status: "active",
      priceId: null,
      periodEnd: null,
      cancelAtPeriodEnd: 0,
      occurredAt,
      now,
      authoritative: false,
    });
    return { userId, subscriptionId };
  }

  return { userId: customUserId(resource), subscriptionId: str(resource.id) };
}

async function applySubscriptionState(
  db: D1Database,
  row: {
    userId: string;
    customerId: string | null;
    subscriptionId: string;
    status: string;
    priceId: string | null;
    periodEnd: number | null;
    cancelAtPeriodEnd: number;
    occurredAt: number;
    now: number;
    /**
     * True only for `BILLING.SUBSCRIPTION.*`, the events that describe the
     * subscription's own state. Everything else merely links an account to it.
     */
    authoritative: boolean;
  },
): Promise<boolean> {
  const existing = await db
    .prepare(
      `SELECT provider_occurred_at FROM subscriptions
       WHERE provider_subscription_id = ? LIMIT 1`,
    )
    .bind(row.subscriptionId)
    .first<{ provider_occurred_at: number | null }>();

  /**
   * Only snapshots are ordered against each other. A sale is often delivered
   * first and stamped a second later, so letting it take part here would let
   * the thinner record permanently block the one carrying the plan and period.
   */
  if (
    row.authoritative &&
    existing &&
    existing.provider_occurred_at != null &&
    row.occurredAt < existing.provider_occurred_at
  ) {
    return false;
  }

  if (existing) {
    if (row.authoritative) {
      await db
        .prepare(
          `UPDATE subscriptions SET
             user_id = ?,
             provider_customer_id = ?,
             status = ?,
             price_id = ?,
             current_period_end = ?,
             cancel_at_period_end = ?,
             provider_occurred_at = ?,
             updated_at = ?
           WHERE provider_subscription_id = ?`,
        )
        .bind(
          row.userId,
          row.customerId,
          row.status,
          row.priceId,
          row.periodEnd,
          row.cancelAtPeriodEnd,
          row.occurredAt,
          row.now,
          row.subscriptionId,
        )
        .run();
    } else {
      await db
        .prepare(
          `UPDATE subscriptions SET
             user_id = ?,
             provider_customer_id = COALESCE(?, provider_customer_id),
             updated_at = ?
           WHERE provider_subscription_id = ?`,
        )
        .bind(row.userId, row.customerId, row.now, row.subscriptionId)
        .run();
    }
    return true;
  }

  await db
    .prepare(
      `INSERT INTO subscriptions (
         id, user_id, provider, provider_customer_id, provider_subscription_id,
         status, price_id, current_period_end, cancel_at_period_end,
         provider_occurred_at, created_at, updated_at
       ) VALUES (?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.subscriptionId,
      row.userId,
      row.customerId,
      row.subscriptionId,
      row.status,
      row.priceId,
      row.periodEnd,
      row.cancelAtPeriodEnd,
      row.authoritative ? row.occurredAt : null,
      row.now,
      row.now,
    )
    .run();
  return true;
}

export type { BillingEnv } from "./types";
