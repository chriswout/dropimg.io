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

export function billingConfig(env: BillingEnv): BillingConfig | null {
  if (!billingEnabled(env)) return null;
  const paddleEnv: PaddleEnvironment =
    env.PADDLE_ENV === "production" ? "production" : "sandbox";
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
  return env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
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

    await db
      .prepare(
        `INSERT INTO subscriptions (
           id, user_id, provider, provider_customer_id, provider_subscription_id,
           status, price_id, current_period_end, cancel_at_period_end,
           created_at, updated_at
         ) VALUES (?, ?, 'paddle', ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(provider_subscription_id) DO UPDATE SET
           user_id = excluded.user_id,
           provider_customer_id = excluded.provider_customer_id,
           status = excluded.status,
           price_id = excluded.price_id,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = excluded.updated_at`,
      )
      .bind(
        subscriptionId,
        userId,
        customerId,
        subscriptionId,
        status,
        priceId,
        periodEnd,
        cancelAtPeriodEnd,
        now,
        now,
      )
      .run();
    return { userId, subscriptionId };
  }

  if (eventType === "transaction.completed") {
    const subscriptionId =
      typeof data.subscription_id === "string" ? data.subscription_id : null;
    const userId = customUserId(data);
    if (!userId || !customerId) return { userId, subscriptionId };
    if (subscriptionId) {
      await db
        .prepare(
          `INSERT INTO subscriptions (
             id, user_id, provider, provider_customer_id, provider_subscription_id,
             status, price_id, current_period_end, cancel_at_period_end,
             created_at, updated_at
           ) VALUES (?, ?, 'paddle', ?, ?, 'active', ?, NULL, 0, ?, ?)
           ON CONFLICT(provider_subscription_id) DO UPDATE SET
             user_id = excluded.user_id,
             provider_customer_id = excluded.provider_customer_id,
             updated_at = excluded.updated_at`,
        )
        .bind(
          subscriptionId,
          userId,
          customerId,
          subscriptionId,
          firstPriceId(data),
          now,
          now,
        )
        .run();
    }
    return { userId, subscriptionId };
  }

  return { userId: customUserId(data), subscriptionId: null };
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
