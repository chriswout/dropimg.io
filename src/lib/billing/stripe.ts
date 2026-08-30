import type {
  BillingConfig,
  BillingEnv,
  CheckoutInterval,
  StripeMode,
  StripeWebhookEvent,
} from "./types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

/**
 * Pinned because Managed Payments requires basil or later, and because the
 * webhook endpoint is registered against this same version: subscription
 * billing periods moved onto items here, so an older account default would
 * hand us a payload shape this code does not read.
 */
export const STRIPE_API_VERSION = "2025-03-31.basil";

export function billingEnabled(env: BillingEnv): boolean {
  return env.BILLING_ENABLED === "true";
}

/**
 * Test and live are distinguished by the key itself rather than a separate
 * setting, so the two can never disagree. A key that is neither disables
 * billing instead of guessing which account would have been charged.
 */
export function stripeMode(env: BillingEnv): StripeMode | null {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  return null;
}

export function billingConfig(env: BillingEnv): BillingConfig | null {
  if (!billingEnabled(env)) return null;
  const mode = stripeMode(env);
  if (!mode) return null;
  const priceMonthly = env.STRIPE_PRICE_MONTHLY?.trim() || "";
  const priceAnnual = env.STRIPE_PRICE_ANNUAL?.trim() || "";
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
  if (id === env.STRIPE_PRICE_ANNUAL?.trim()) return "annual";
  if (id === env.STRIPE_PRICE_MONTHLY?.trim()) return "monthly";
  return null;
}

type FormValue = string | number | boolean | FormShape | FormValue[];
type FormShape = { [key: string]: FormValue | undefined };

/** Stripe takes form bodies with bracketed paths, not JSON. */
export function encodeForm(shape: FormShape): string {
  const parts: string[] = [];
  const walk = (prefix: string, value: FormValue | undefined) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(`${prefix}[${i}]`, item));
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(`${prefix}[${k}]`, v);
      return;
    }
    parts.push(
      `${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`,
    );
  };
  for (const [k, v] of Object.entries(shape)) walk(k, v);
  return parts.join("&");
}

type StripeResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function stripeRequest<T>(
  env: BillingEnv,
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: FormShape } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<StripeResult<T>> {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key || !stripeMode(env)) return { ok: false, error: "stripe_unconfigured" };

  const res = await fetchImpl(`${STRIPE_API_BASE}${path}`, {
    method: init.method ?? "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init.body ? encodeForm(init.body) : undefined,
  });

  const body = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: string } })
    | null;
  if (!res.ok || !body || body.error) {
    return { ok: false, error: body?.error?.code || body?.error?.message || "stripe_error" };
  }
  return { ok: true, data: body };
}

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
): Promise<StripeResult<{ id: string; url: string }>> {
  /**
   * The user id rides on the subscription as well as the session because the
   * two webhooks race: whichever arrives first has to be able to name the
   * account on its own.
   */
  const metadata = { dropimg_user_id: opts.userId };
  const body: FormShape = {
    mode: "subscription",
    "line_items[0][price]": opts.priceId,
    "line_items[0][quantity]": 1,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.userId,
    metadata,
    subscription_data: { metadata },
    managed_payments: { enabled: true },
  };
  if (opts.customerId) body.customer = opts.customerId;
  else if (opts.email) body.customer_email = opts.email;

  const res = await stripeRequest<{ id: string; url: string | null }>(
    env,
    "/checkout/sessions",
    { body },
    fetchImpl,
  );
  if (!res.ok) return res;
  if (!res.data.url) return { ok: false, error: "stripe_no_checkout_url" };
  return { ok: true, data: { id: res.data.id, url: res.data.url } };
}

export async function createPortalUrl(
  env: BillingEnv,
  customerId: string,
  returnUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const res = await stripeRequest<{ url?: string }>(
    env,
    "/billing_portal/sessions",
    { body: { customer: customerId, return_url: returnUrl } },
    fetchImpl,
  );
  return res.ok ? (res.data.url ?? null) : null;
}

export async function cancelStripeSubscriptionImmediately(
  env: BillingEnv,
  subscriptionId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await stripeRequest<{ id: string }>(
    env,
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "DELETE" },
    fetchImpl,
  );
  if (res.ok) return { ok: true };
  /** Already gone is the state we wanted, not a failure to reach it. */
  if (res.error === "resource_missing") return { ok: true };
  return {
    ok: false,
    error: res.error === "stripe_unconfigured" ? "stripe_unconfigured" : "stripe_cancel_failed",
  };
}

/** Statuses worth cancelling before we delete an account. */
export const LIVE_STRIPE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

export function isLiveStripeStatus(status: string | null | undefined): boolean {
  return LIVE_STRIPE_STATUSES.has((status ?? "").trim().toLowerCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/** Expandable fields arrive as either a bare id or the whole object. */
function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  const rec = asRecord(value);
  return typeof rec?.id === "string" ? rec.id : null;
}

export function metadataUserId(data: Record<string, unknown>): string | null {
  const meta = asRecord(data.metadata);
  const id = meta?.dropimg_user_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function subscriptionItems(data: Record<string, unknown>): Record<string, unknown>[] {
  const items = asRecord(data.items);
  const list = Array.isArray(items?.data) ? items.data : [];
  return list.map(asRecord).filter((x): x is Record<string, unknown> => x !== null);
}

/**
 * Billing periods live on the items as of the basil API version. A single-item
 * subscription is all we sell, but taking the furthest end keeps a mixed one
 * from expiring Pro early.
 */
function periodEndOf(data: Record<string, unknown>): number | null {
  let end: number | null = null;
  for (const item of subscriptionItems(data)) {
    const value = item.current_period_end;
    if (typeof value === "number" && (end === null || value > end)) end = value;
  }
  return end;
}

function priceIdOf(data: Record<string, unknown>): string | null {
  for (const item of subscriptionItems(data)) {
    const id = idOf(item.price);
    if (id) return id;
  }
  return null;
}

export async function upsertSubscriptionFromEvent(
  db: D1Database,
  event: StripeWebhookEvent,
  now = Math.floor(Date.now() / 1000),
): Promise<{ userId: string | null; subscriptionId: string | null }> {
  const data = event.data.object;
  const occurredAt = typeof event.created === "number" ? event.created : now;

  if (event.type.startsWith("customer.subscription.")) {
    const subscriptionId = typeof data.id === "string" ? data.id : null;
    if (!subscriptionId) return { userId: null, subscriptionId: null };
    const customerId = idOf(data.customer);
    const status =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : typeof data.status === "string"
          ? data.status
          : "unknown";

    let userId = metadataUserId(data);
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
      priceId: priceIdOf(data),
      periodEnd: periodEndOf(data),
      cancelAtPeriodEnd: data.cancel_at_period_end === true ? 1 : 0,
      occurredAt,
      now,
      authoritative: true,
    });
    return { userId, subscriptionId };
  }

  if (event.type === "checkout.session.completed") {
    const subscriptionId = idOf(data.subscription);
    const customerId = idOf(data.customer);
    const userId =
      metadataUserId(data) ||
      (typeof data.client_reference_id === "string" ? data.client_reference_id : null);
    if (!userId || !subscriptionId) return { userId, subscriptionId };
    if (data.payment_status === "unpaid") return { userId, subscriptionId };

    /**
     * The session knows who paid but not the billing period, so it only
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

  return { userId: metadataUserId(data), subscriptionId: null };
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
     * True only for `customer.subscription.*`, the events that describe the
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
   * Only snapshots are ordered against each other. A checkout session is
   * stamped a second or so after the subscription it created and is often
   * delivered first, so letting it take part here would let the thinner record
   * permanently block the one carrying the price and billing period.
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
       ) VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
