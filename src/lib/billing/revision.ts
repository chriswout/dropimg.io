import type { BillingEnv, BillingProduct, CheckoutInterval, WebAssetsPaidPlan } from "./types";
import {
  DROPS_PRO_PRICES,
  WEB_ASSETS_PRICES,
  dropsProLabel,
  formatAdvertisedPrice,
  nextChargeLabel,
  webAssetsPaidLabel,
} from "./catalog";
import { getSubscriptionEntitlementState } from "./lifecycle";
import { catalogForPriceIdLocal } from "./plan-label";
import {
  billingProductForPriceId,
  parsePaypalSubscriptionId,
  priceIdForInterval,
  priceIdForWebAssetsPlan,
  revisePaypalSubscription,
  billingConfig,
  webAssetsBillingConfig,
} from "./paypal";
import type { SubscriptionSnapshot } from "../entitlements";

export type PlanChangeTarget = {
  product: BillingProduct;
  priceId: string;
  plan: "pro" | WebAssetsPaidPlan;
  interval: CheckoutInterval;
  label: string;
  nextCharge: string;
  priceLabel: string;
};

export type PlanChangePreview = {
  product: BillingProduct;
  currentLabel: string;
  nextLabel: string;
  effectiveAt: number;
  nextCharge: string;
  proratedToday: false;
};

export type OwnedSubscription = SubscriptionSnapshot & {
  provider_subscription_id: string;
  product: BillingProduct;
  pending_price_id?: string | null;
  pending_effective_at?: number | null;
};

export function resolvePlanChangeTarget(
  env: BillingEnv,
  product: BillingProduct,
  body: { plan?: string; interval?: string },
): PlanChangeTarget | { error: string } {
  const interval: CheckoutInterval | null =
    body.interval === "annual" ? "annual" : body.interval === "monthly" ? "monthly" : null;
  if (!interval) return { error: "That billing option isn’t available." };

  if (product === "drops_pro") {
    if (body.plan && body.plan !== "pro") return { error: "That plan isn’t available." };
    const config = billingConfig(env);
    if (!config) return { error: "Billing is not available." };
    const priceId = priceIdForInterval(config, interval);
    return {
      product,
      priceId,
      plan: "pro",
      interval,
      label: dropsProLabel(interval),
      nextCharge: nextChargeLabel(DROPS_PRO_PRICES[interval]),
      priceLabel: formatAdvertisedPrice(DROPS_PRO_PRICES[interval]),
    };
  }

  const plan: WebAssetsPaidPlan | null =
    body.plan === "pro" ? "pro" : body.plan === "developer" ? "developer" : null;
  if (!plan) return { error: "That plan isn’t available." };
  const config = webAssetsBillingConfig(env);
  if (!config) return { error: "Billing is not available." };
  const priceId = priceIdForWebAssetsPlan(config, plan, interval);
  if (billingProductForPriceId(env, priceId) !== "web_assets") {
    return { error: "That plan isn’t available." };
  }
  return {
    product,
    priceId,
    plan,
    interval,
    label: webAssetsPaidLabel(plan, interval),
    nextCharge: nextChargeLabel(WEB_ASSETS_PRICES[plan][interval]),
    priceLabel: formatAdvertisedPrice(WEB_ASSETS_PRICES[plan][interval]),
  };
}

export function previewPlanChange(
  env: BillingEnv,
  row: OwnedSubscription,
  target: PlanChangeTarget,
  now = Math.floor(Date.now() / 1000),
): PlanChangePreview | { error: string; code: string } {
  const life = getSubscriptionEntitlementState(row, now);
  if (!life.planChangeAllowed) {
    return { error: "This subscription cannot be changed right now.", code: "plan_change_blocked" };
  }
  if (row.product !== target.product) {
    return { error: "That plan isn’t available.", code: "unknown_plan" };
  }
  if (row.price_id === target.priceId) {
    return { error: "You are already on that plan.", code: "unchanged" };
  }
  if (
    row.pending_price_id &&
    row.pending_price_id !== target.priceId &&
    row.pending_effective_at != null &&
    row.pending_effective_at > now
  ) {
    return { error: "A plan change is already scheduled.", code: "revision_in_progress" };
  }
  const effectiveAt = row.current_period_end;
  if (effectiveAt == null || effectiveAt <= now) {
    return { error: "Next billing date is not available yet.", code: "period_unknown" };
  }
  return {
    product: target.product,
    currentLabel: catalogForPriceIdLocal(env, row.price_id) || target.product,
    nextLabel: target.label,
    effectiveAt,
    nextCharge: target.nextCharge,
    proratedToday: false,
  };
}

export async function loadOwnedSubscription(
  db: D1Database,
  userId: string,
  product: BillingProduct,
): Promise<OwnedSubscription | null> {
  return (
    (await db
      .prepare(
        `SELECT status, price_id, current_period_end, cancel_at_period_end,
                provider_subscription_id, product, pending_price_id, pending_effective_at
         FROM subscriptions
         WHERE user_id = ? AND provider = 'paypal' AND product = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(userId, product)
      .first<OwnedSubscription>()) ?? null
  );
}

export async function persistPendingRevision(
  db: D1Database,
  opts: {
    subscriptionId: string;
    pendingPriceId: string;
    pendingEffectiveAt: number;
    now: number;
  },
): Promise<void> {
  await db
    .prepare(
      `UPDATE subscriptions
       SET pending_price_id = ?, pending_effective_at = ?, updated_at = ?
       WHERE provider_subscription_id = ?`,
    )
    .bind(opts.pendingPriceId, opts.pendingEffectiveAt, opts.now, opts.subscriptionId)
    .run();
}

export { parsePaypalSubscriptionId, revisePaypalSubscription };
