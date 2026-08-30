import type {
  BillingConfig,
  BillingEnv,
  CheckoutInterval,
  PaddleEnvironment,
  PaddleWebhookEvent,
} from "./types";

export function billingEnabled(env: BillingEnv): boolean {
  return env.BILLING_ENABLED === "true";
}

/**
 * Anything we don't recognise means sandbox, so a typo costs a broken checkout
 * rather than a real charge. Paddle's own word for production is "live", and
 * config written from their docs would otherwise be silently wrong.
 */
function isLive(env: BillingEnv): boolean {
  const value = env.PADDLE_ENV?.trim().toLowerCase();
  return value === "production" || value === "live";
}

export function billingConfig(env: BillingEnv): BillingConfig | null {
  if (!billingEnabled(env)) return null;
  const paddleEnv: PaddleEnvironment = isLive(env) ? "production" : "sandbox";
  const clientToken = env.PADDLE_CLIENT_TOKEN?.trim() || "";
  const priceMonthly = env.PADDLE_PRICE_MONTHLY?.trim() || "";
  const priceAnnual = env.PADDLE_PRICE_ANNUAL?.trim() || "";
  if (!clientToken || !priceMonthly || !priceAnnual) return null;
  return { env: paddleEnv, clientToken, priceMonthly, priceAnnual };
}

export function priceIdForInterval(
  config: BillingConfig,
  interval: CheckoutInterval,
): string {
  return interval === "annual" ? config.priceAnnual : config.priceMonthly;
}

export function paddleApiBase(env: BillingEnv): string {
  return isLive(env) ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function customUserId(data: Record<string, unknown>): string | null {
  const custom = asRecord(data.custom_data);
  const id = custom?.dropimg_user_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function unixFromIso(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function firstPriceId(data: Record<string, unknown>): string | null {
  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    const rec = asRecord(item);
    const price = asRecord(rec?.price);
    if (typeof price?.id === "string") return price.id;
    if (typeof rec?.price_id === "string") return rec.price_id;
  }
  return typeof data.price_id === "string" ? data.price_id : null;
}

export async function upsertSubscriptionFromEvent(
  db: D1Database,
  event: PaddleWebhookEvent,
  now = Math.floor(Date.now() / 1000),
): Promise<{ userId: string | null; subscriptionId: string | null }> {
  const data = event.data;
  const eventType = event.event_type;
  const customerId =
    typeof data.customer_id === "string" ? data.customer_id : null;

  if (eventType.startsWith("subscription.")) {
    const subscriptionId = typeof data.id === "string" ? data.id : null;
    if (!subscriptionId) return { userId: null, subscriptionId: null };
    const status = typeof data.status === "string" ? data.status : "unknown";
    const period = asRecord(data.current_billing_period);
    const scheduled = asRecord(data.scheduled_change);
    const periodEnd = unixFromIso(period?.ends_at);
    const cancelAtPeriodEnd = scheduled?.action === "cancel" ? 1 : 0;
    const priceId = firstPriceId(data);
    let userId = customUserId(data);
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
      priceId,
      periodEnd,
      cancelAtPeriodEnd,
      occurredAt: unixFromIso(event.occurred_at) ?? now,
      now,
      statusOnConflict: true,
    });
    return { userId, subscriptionId };
  }

  if (eventType === "transaction.completed") {
    const subscriptionId =
      typeof data.subscription_id === "string" ? data.subscription_id : null;
    const userId = customUserId(data);
    if (!userId || !customerId) return { userId, subscriptionId };
    if (subscriptionId) {
      await applySubscriptionState(db, {
        userId,
        customerId,
        subscriptionId,
        status: "active",
        priceId: firstPriceId(data),
        periodEnd: null,
        cancelAtPeriodEnd: 0,
        occurredAt: unixFromIso(event.occurred_at) ?? now,
        now,
        statusOnConflict: false,
      });
    }
    return { userId, subscriptionId };
  }

  return { userId: customUserId(data), subscriptionId: null };
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
    statusOnConflict: boolean;
  },
): Promise<boolean> {
  const existing = await db
    .prepare(
      `SELECT provider_occurred_at FROM subscriptions
       WHERE provider_subscription_id = ? LIMIT 1`,
    )
    .bind(row.subscriptionId)
    .first<{ provider_occurred_at: number | null }>();

  if (
    existing &&
    existing.provider_occurred_at != null &&
    row.occurredAt < existing.provider_occurred_at
  ) {
    return false;
  }

  if (existing) {
    if (row.statusOnConflict) {
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
             provider_customer_id = ?,
             provider_occurred_at = ?,
             updated_at = ?
           WHERE provider_subscription_id = ?`,
        )
        .bind(
          row.userId,
          row.customerId,
          row.occurredAt,
          row.now,
          row.subscriptionId,
        )
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
       ) VALUES (?, ?, 'paddle', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      row.occurredAt,
      row.now,
      row.now,
    )
    .run();
  return true;
}

export const LIVE_PADDLE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "paused",
]);

export function isLivePaddleStatus(status: string | null | undefined): boolean {
  return LIVE_PADDLE_STATUSES.has((status ?? "").trim().toLowerCase());
}

export async function cancelPaddleSubscriptionImmediately(
  env: BillingEnv,
  subscriptionId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = env.PADDLE_API_KEY?.trim();
  if (!key) return { ok: false, error: "paddle_unconfigured" };
  const res = await fetchImpl(
    `${paddleApiBase(env)}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Paddle-Version": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: "immediately" }),
    },
  );
  if (!res.ok) return { ok: false, error: "paddle_cancel_failed" };
  return { ok: true };
}

export async function createPortalUrl(
  env: BillingEnv,
  customerId: string,
  subscriptionIds: string[] = [],
): Promise<string | null> {
  const key = env.PADDLE_API_KEY?.trim();
  if (!key) return null;
  const res = await fetch(
    `${paddleApiBase(env)}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Paddle-Version": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        subscriptionIds.length ? { subscription_ids: subscriptionIds } : {},
      ),
    },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: { urls?: { general?: { overview?: string } } };
  };
  return body.data?.urls?.general?.overview ?? null;
}
