import type { BillingEnv, BillingProduct } from "./types";
import { formatMoney, productTitle } from "./catalog";
import { paypalMode } from "./paypal";
import { catalogForPriceIdLocal } from "./plan-label";

export type BillingPaymentRow = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  product: BillingProduct;
  plan_id: string | null;
  provider_transaction_id: string | null;
  amount: string | null;
  currency: string | null;
  status: string;
  paid_at: number | null;
  receipt_url: string | null;
};

export function paypalReceiptUrl(
  env: BillingEnv,
  transactionId: string | null | undefined,
): string | null {
  const id = transactionId?.trim();
  if (!id) return null;
  const mode = paypalMode(env);
  if (mode === "test") {
    return `https://www.sandbox.paypal.com/activity/payment/${encodeURIComponent(id)}`;
  }
  if (mode === "live") {
    return `https://www.paypal.com/activity/payment/${encodeURIComponent(id)}`;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
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

function saleAmount(resource: Record<string, unknown>): {
  amount: string | null;
  currency: string | null;
} {
  const amount = asRecord(resource.amount);
  if (!amount) return { amount: null, currency: null };
  return {
    amount: str(amount.total) || str(amount.value),
    currency: str(amount.currency) || str(amount.currency_code),
  };
}

export async function recordPaymentFromSaleEvent(
  db: D1Database,
  env: BillingEnv,
  opts: {
    eventId: string;
    eventType: string;
    resource: Record<string, unknown>;
    userId: string | null;
    subscriptionId: string | null;
    now: number;
  },
): Promise<boolean> {
  const txnId =
    str(opts.resource.id) ||
    str(opts.resource.sale_id) ||
    `evt:${opts.eventId}`;
  let status = "paid";
  if (opts.eventType === "PAYMENT.SALE.REFUNDED") status = "refunded";
  else if (
    opts.eventType === "PAYMENT.SALE.DENIED" ||
    opts.eventType.endsWith("PAYMENT.FAILED")
  ) {
    status = "failed";
  }

  let userId = opts.userId;
  let product: BillingProduct | null = null;
  let planId: string | null = null;
  let periodEnd: number | null = null;
  if (opts.subscriptionId) {
    const row = await db
      .prepare(
        `SELECT user_id, product, price_id, current_period_end
         FROM subscriptions
         WHERE provider_subscription_id = ?
         LIMIT 1`,
      )
      .bind(opts.subscriptionId)
      .first<{
        user_id: string;
        product: BillingProduct;
        price_id: string | null;
        current_period_end: number | null;
      }>();
    if (row) {
      userId = userId || row.user_id;
      product = row.product;
      planId = row.price_id;
      periodEnd = row.current_period_end;
    }
  }
  if (!userId || !product) return false;

  const { amount, currency } = saleAmount(opts.resource);
  const paidAt =
    unixFromIso(opts.resource.create_time) ??
    unixFromIso(opts.resource.update_time) ??
    opts.now;
  const receiptUrl = status === "failed" ? null : paypalReceiptUrl(env, str(opts.resource.id));
  const id = `${product}:${txnId}`;

  if (status === "refunded") {
    const updated = await db
      .prepare(
        `UPDATE billing_payments
         SET status = 'refunded'
         WHERE provider = 'paypal' AND (provider_transaction_id = ? OR id = ?)`,
      )
      .bind(txnId, id)
      .run();
    if ((updated.meta?.changes ?? 0) > 0) return true;
  }

  try {
    await db
      .prepare(
        `INSERT INTO billing_payments (
           id, user_id, subscription_id, product, plan_id, provider,
           provider_transaction_id, amount, currency, status, paid_at,
           period_end, receipt_url, created_at
         ) VALUES (?, ?, ?, ?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        userId,
        opts.subscriptionId,
        product,
        planId,
        txnId,
        amount,
        currency,
        status,
        paidAt,
        periodEnd,
        receiptUrl,
        opts.now,
      )
      .run();
    return true;
  } catch {
    if (status === "refunded") {
      await db
        .prepare(
          `UPDATE billing_payments SET status = 'refunded'
           WHERE provider = 'paypal' AND provider_transaction_id = ?`,
        )
        .bind(txnId)
        .run();
    }
    return false;
  }
}

export async function listPaymentsForUser(
  db: D1Database,
  userId: string,
  limit = 50,
): Promise<BillingPaymentRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_id, subscription_id, product, plan_id, provider_transaction_id,
              amount, currency, status, paid_at, receipt_url
       FROM billing_payments
       WHERE user_id = ?
       ORDER BY COALESCE(paid_at, created_at) DESC
       LIMIT ?`,
    )
    .bind(userId, limit)
    .all<BillingPaymentRow>();
  return results ?? [];
}

export function paymentProductLabel(env: BillingEnv, row: BillingPaymentRow): string {
  return catalogForPriceIdLocal(env, row.plan_id) || productTitle(row.product);
}

export function paymentAmountLabel(row: BillingPaymentRow): string {
  if (!row.amount) return "—";
  return formatMoney(row.amount, row.currency || "");
}
