import type { BillingEnv, BillingProduct, CheckoutInterval, WebAssetsPaidPlan } from "./types";
import {
  DROPS_PRO_PRICES,
  WEB_ASSETS_PRICES,
  dropsProLabel,
  formatAdvertisedPrice,
  webAssetsPaidLabel,
} from "./catalog";
import { getSubscriptionEntitlementState } from "./lifecycle";
import { listPaymentsForUser, paymentAmountLabel, paymentProductLabel, type BillingPaymentRow } from "./payments";
import { catalogForPriceIdLocal } from "./plan-label";
import { settlePendingPlanChanges } from "./pending";
import { createPortalUrl, intervalForPrice } from "./paypal";
import { loadOwnedSubscription, type OwnedSubscription } from "./revision";
import { webAssetsPlanForPriceId } from "../web-assets-entitlements";

export type PortalPlanOption = {
  plan: "pro" | WebAssetsPaidPlan;
  interval: CheckoutInterval;
  label: string;
};

export type PortalProductCard = {
  product: BillingProduct;
  entitled: boolean;
  planLabel: string;
  priceLabel: string;
  status: string;
  statusLabel: string;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  pendingLabel: string | null;
  pendingEffectiveAt: number | null;
  canChangePlan: boolean;
  canCancel: boolean;
  options: PortalPlanOption[];
};

export type PortalPayment = {
  id: string;
  paidAt: number | null;
  productLabel: string;
  amountLabel: string;
  status: string;
  receiptUrl: string | null;
};

export type BillingPortalModel = {
  drops: PortalProductCard;
  webAssets: PortalProductCard;
  payments: PortalPayment[];
  paypalWalletUrl: string | null;
};

function optionsFor(
  env: BillingEnv,
  product: BillingProduct,
  row: OwnedSubscription | null,
): PortalPlanOption[] {
  if (!row) return [];
  if (product === "drops_pro") {
    const current = intervalForPrice(env, row.price_id);
    return (["monthly", "annual"] as const)
      .filter((interval) => interval !== current)
      .map((interval) => ({
        plan: "pro" as const,
        interval,
        label: dropsProLabel(interval),
      }));
  }
  const current = webAssetsPlanForPriceId(env, row.price_id);
  const out: PortalPlanOption[] = [];
  for (const plan of ["developer", "pro"] as const) {
    for (const interval of ["monthly", "annual"] as const) {
      if (current?.plan === plan && current.interval === interval) continue;
      out.push({ plan, interval, label: webAssetsPaidLabel(plan, interval) });
    }
  }
  return out;
}

function cardFor(
  env: BillingEnv,
  product: BillingProduct,
  row: OwnedSubscription | null,
  now: number,
): PortalProductCard {
  const life = getSubscriptionEntitlementState(row, now);
  const pendingLabel = catalogForPriceIdLocal(env, row?.pending_price_id);
  if (product === "drops_pro") {
    const interval = intervalForPrice(env, row?.price_id);
    const entitled = life.entitled;
    return {
      product,
      entitled,
      planLabel: entitled ? dropsProLabel(interval) : "Drops Free",
      priceLabel: entitled && interval ? formatAdvertisedPrice(DROPS_PRO_PRICES[interval]) : "€0",
      status: life.state,
      statusLabel: life.uiStatus,
      periodEnd: row?.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
      pendingLabel: pendingLabel && row?.pending_effective_at && row.pending_effective_at > now ? pendingLabel : null,
      pendingEffectiveAt:
        row?.pending_effective_at && row.pending_effective_at > now ? row.pending_effective_at : null,
      canChangePlan: life.planChangeAllowed,
      canCancel: life.cancelAllowed,
      options: life.planChangeAllowed ? optionsFor(env, product, row) : [],
    };
  }
  const mapped = webAssetsPlanForPriceId(env, row?.price_id);
  const entitled = life.entitled && mapped != null;
  return {
    product,
    entitled,
    planLabel: entitled && mapped ? webAssetsPaidLabel(mapped.plan, mapped.interval) : "Web Assets Free",
    priceLabel: entitled && mapped ? formatAdvertisedPrice(WEB_ASSETS_PRICES[mapped.plan][mapped.interval]) : "$0",
    status: life.state,
    statusLabel: entitled ? life.uiStatus : row ? life.uiStatus : "Free",
    periodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    pendingLabel: pendingLabel && row?.pending_effective_at && row.pending_effective_at > now ? pendingLabel : null,
    pendingEffectiveAt:
      row?.pending_effective_at && row.pending_effective_at > now ? row.pending_effective_at : null,
    canChangePlan: life.planChangeAllowed,
    canCancel: life.cancelAllowed,
    options: life.planChangeAllowed ? optionsFor(env, product, row) : [],
  };
}

function mapPayment(env: BillingEnv, row: BillingPaymentRow): PortalPayment {
  return {
    id: row.id,
    paidAt: row.paid_at,
    productLabel: paymentProductLabel(env, row),
    amountLabel: paymentAmountLabel(row),
    status: row.status,
    receiptUrl: row.receipt_url,
  };
}

export async function loadBillingPortal(
  env: Cloudflare.Env & BillingEnv,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<BillingPortalModel> {
  await settlePendingPlanChanges(env.DB, { userId, now });
  const [dropsRow, waRow, payments] = await Promise.all([
    loadOwnedSubscription(env.DB, userId, "drops_pro"),
    loadOwnedSubscription(env.DB, userId, "web_assets"),
    listPaymentsForUser(env.DB, userId),
  ]);
  return {
    drops: cardFor(env, "drops_pro", dropsRow, now),
    webAssets: cardFor(env, "web_assets", waRow, now),
    payments: payments.map((row) => mapPayment(env, row)),
    paypalWalletUrl: createPortalUrl(env),
  };
}
