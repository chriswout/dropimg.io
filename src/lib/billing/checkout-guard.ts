/** Server-side lock so we never mint a second live PayPal subscription. */

import { isProSubscription } from "../entitlements";
import {
  cancelPaypalSubscriptionImmediately,
  isLivePaypalStatus,
  parsePaypalSubscriptionId,
  type BillingEnv,
} from "./paypal";
import type { BillingProduct } from "./types";

export const CHECKOUT_PENDING_TTL_SECONDS = 30 * 60;

export type CheckoutBlockCode =
  | "already_subscribed"
  | "checkout_in_progress"
  | "plan_change_blocked";

export type CheckoutBlock = {
  code: CheckoutBlockCode;
  error: string;
  product: BillingProduct;
  manage: "/app/billing";
};

export type SubscriptionGuardRow = {
  status: string;
  current_period_end: number | null;
  cancel_at_period_end?: number | boolean;
  updated_at?: number | null;
  provider_subscription_id?: string | null;
};

export function pendingCheckoutId(product: BillingProduct, userId: string): string {
  return `pending:${product}:${userId}`;
}

export function checkoutBlockMessage(
  code: CheckoutBlockCode,
  product: BillingProduct,
): string {
  if (code === "checkout_in_progress") {
    return "Checkout is already in progress. If you cancelled on PayPal, try again to start a new checkout.";
  }
  if (product === "web_assets") {
    return "You already have a live Web Assets subscription. Change plan from Billing — DropIMG will not start a second subscription or prorate unused time.";
  }
  return "You already have Drops Pro. Change the billing interval from Billing, or manage it in PayPal.";
}

export function checkoutBlockForRows(
  rows: SubscriptionGuardRow[],
  opts: { product: BillingProduct; now: number },
): CheckoutBlock | null {
  for (const row of rows) {
    const status = row.status.trim().toLowerCase();
    if (status === "approval_pending") {
      const stamp = row.updated_at ?? 0;
      if (opts.now - stamp <= CHECKOUT_PENDING_TTL_SECONDS) {
        return block("checkout_in_progress", opts.product);
      }
      continue;
    }
    if (isLivePaypalStatus(status) || isProSubscription({
      status: row.status,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end ?? 0,
    }, opts.now)) {
      return block(
        opts.product === "web_assets" ? "plan_change_blocked" : "already_subscribed",
        opts.product,
      );
    }
  }
  return null;
}

function block(code: CheckoutBlockCode, product: BillingProduct): CheckoutBlock {
  return {
    code,
    product,
    manage: "/app/billing",
    error: checkoutBlockMessage(code, product),
  };
}

export async function loadProductSubscriptionRows(
  db: D1Database,
  userId: string,
  product: BillingProduct,
): Promise<SubscriptionGuardRow[]> {
  const { results } = await db
    .prepare(
      `SELECT status, current_period_end, cancel_at_period_end, updated_at,
              provider_subscription_id
       FROM subscriptions
       WHERE user_id = ? AND provider = 'paypal' AND product = ?`,
    )
    .bind(userId, product)
    .all<SubscriptionGuardRow>();
  return results ?? [];
}

async function releaseStalePending(
  env: BillingEnv,
  db: D1Database,
  rows: SubscriptionGuardRow[],
  now: number,
  fetchImpl: typeof fetch,
): Promise<void> {
  for (const row of rows) {
    const status = row.status.trim().toLowerCase();
    if (status !== "approval_pending") continue;
    const stamp = row.updated_at ?? 0;
    if (now - stamp <= CHECKOUT_PENDING_TTL_SECONDS) continue;
    const id = row.provider_subscription_id?.trim();
    if (!id) continue;
    const paypalId = parsePaypalSubscriptionId(id);
    if (paypalId) {
      await cancelPaypalSubscriptionImmediately(env, paypalId, fetchImpl);
    }
    await db
      .prepare(`DELETE FROM subscriptions WHERE provider_subscription_id = ?`)
      .bind(id)
      .run();
  }
}

export async function reserveCheckout(
  env: BillingEnv,
  db: D1Database,
  opts: {
    userId: string;
    product: BillingProduct;
    priceId: string;
    now?: number;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; reservationId: string } | { ok: false; block: CheckoutBlock }> {
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const existing = await loadProductSubscriptionRows(db, opts.userId, opts.product);
  await releaseStalePending(env, db, existing, now, fetchImpl);
  const remaining = await loadProductSubscriptionRows(db, opts.userId, opts.product);
  const blocked = checkoutBlockForRows(remaining, { product: opts.product, now });
  if (blocked) return { ok: false, block: blocked };

  const reservationId = pendingCheckoutId(opts.product, opts.userId);
  try {
    await db
      .prepare(
        `INSERT INTO subscriptions (
           id, user_id, provider, provider_subscription_id,
           status, price_id, product, current_period_end, cancel_at_period_end,
           created_at, updated_at
         ) VALUES (?, ?, 'paypal', ?, 'approval_pending', ?, ?, NULL, 0, ?, ?)`,
      )
      .bind(
        reservationId,
        opts.userId,
        reservationId,
        opts.priceId,
        opts.product,
        now,
        now,
      )
      .run();
  } catch {
    return {
      ok: false,
      block: block(
        opts.product === "web_assets" ? "plan_change_blocked" : "checkout_in_progress",
        opts.product,
      ),
    };
  }
  return { ok: true, reservationId };
}

export async function attachPaypalSubscriptionId(
  db: D1Database,
  reservationId: string,
  paypalSubscriptionId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE subscriptions
         SET id = ?, provider_subscription_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(paypalSubscriptionId, paypalSubscriptionId, now, reservationId)
      .run();
  } catch {
    await db
      .prepare(`DELETE FROM subscriptions WHERE id = ?`)
      .bind(reservationId)
      .run();
  }
}

export async function releaseCheckoutReservation(
  db: D1Database,
  reservationId: string,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM subscriptions
       WHERE id = ? AND status = 'approval_pending'`,
    )
    .bind(reservationId)
    .run();
}

/**
 * Buyer bounced from PayPal (cancel_url or a second pricing click).
 * Drop the reservation and cancel any minted I-… that never activated.
 * Live / paid-through rows are left alone.
 */
export async function abandonPendingCheckout(
  env: BillingEnv,
  db: D1Database,
  opts: { userId: string; product: BillingProduct },
  fetchImpl: typeof fetch = fetch,
): Promise<{ abandoned: boolean }> {
  const rows = await loadProductSubscriptionRows(db, opts.userId, opts.product);
  const pending = rows.filter(
    (row) => row.status.trim().toLowerCase() === "approval_pending",
  );
  if (!pending.length) return { abandoned: false };

  for (const row of pending) {
    const paypalId = parsePaypalSubscriptionId(row.provider_subscription_id);
    if (paypalId) {
      await cancelPaypalSubscriptionImmediately(
        env,
        paypalId,
        fetchImpl,
        "Buyer cancelled PayPal checkout",
      );
    }
  }

  await db
    .prepare(
      `DELETE FROM subscriptions
       WHERE user_id = ? AND provider = 'paypal' AND product = ?
         AND status = 'approval_pending'`,
    )
    .bind(opts.userId, opts.product)
    .run();
  return { abandoned: true };
}
