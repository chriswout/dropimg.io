/** Server-authoritative Web Assets plan. Never trust a client-supplied plan id. */

import type { BillingEnv } from "./billing/types";
import { settlePendingPlanChanges } from "./billing/pending";
import { isProSubscription, type SubscriptionSnapshot } from "./entitlements";
import {
  WEB_ASSETS_PLANS,
  type WebAssetsPlanConfig,
  type WebAssetsPlanId,
} from "./web-assets-plans";

export type WebAssetsSubscriptionSnapshot = SubscriptionSnapshot & {
  product?: string | null;
};

export type WebAssetsEntitlements = {
  plan: WebAssetsPlanId;
  config: WebAssetsPlanConfig;
  interval: "monthly" | "annual" | null;
  status: string | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
};

export function webAssetsPlanForPriceId(
  env: BillingEnv,
  priceId: string | null | undefined,
): { plan: Exclude<WebAssetsPlanId, "free">; interval: "monthly" | "annual" } | null {
  const id = priceId?.trim();
  if (!id) return null;
  if (id === env.PAYPAL_WA_DEVELOPER_MONTHLY?.trim()) {
    return { plan: "developer", interval: "monthly" };
  }
  if (id === env.PAYPAL_WA_DEVELOPER_ANNUAL?.trim()) {
    return { plan: "developer", interval: "annual" };
  }
  if (id === env.PAYPAL_WA_PRO_MONTHLY?.trim()) {
    return { plan: "pro", interval: "monthly" };
  }
  if (id === env.PAYPAL_WA_PRO_ANNUAL?.trim()) {
    return { plan: "pro", interval: "annual" };
  }
  return null;
}

export function isWebAssetsPriceId(env: BillingEnv, priceId: string | null | undefined): boolean {
  return webAssetsPlanForPriceId(env, priceId) != null;
}

export function resolveWebAssetsEntitlements(input: {
  subscription?: WebAssetsSubscriptionSnapshot | null;
  env: BillingEnv;
  now?: number;
}): WebAssetsEntitlements {
  const sub = input.subscription;
  const paid = isProSubscription(sub, input.now);
  const mapped = paid ? webAssetsPlanForPriceId(input.env, sub?.price_id) : null;
  const plan: WebAssetsPlanId = mapped?.plan ?? "free";
  return {
    plan,
    config: WEB_ASSETS_PLANS[plan],
    interval: mapped?.interval ?? null,
    status: sub?.status ?? null,
    periodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
  };
}

export async function loadWebAssetsSubscription(
  db: D1Database,
  userId: string,
): Promise<WebAssetsSubscriptionSnapshot | null> {
  const row = await db
    .prepare(
      `SELECT status, price_id, current_period_end, cancel_at_period_end, product
       FROM subscriptions
       WHERE user_id = ? AND provider = 'paypal' AND product = 'web_assets'
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first<WebAssetsSubscriptionSnapshot>();
  return row ?? null;
}

export async function webAssetsEntitlementsFor(
  env: Cloudflare.Env & BillingEnv,
  userId: string,
): Promise<WebAssetsEntitlements> {
  await settlePendingPlanChanges(env.DB, { userId });
  const subscription = await loadWebAssetsSubscription(env.DB, userId);
  return resolveWebAssetsEntitlements({ subscription, env });
}

export async function webAssetsEntitlementsForOrg(
  env: Cloudflare.Env & BillingEnv,
  org: { personal_user_id: string | null },
): Promise<WebAssetsEntitlements> {
  if (!org.personal_user_id) {
    return resolveWebAssetsEntitlements({ subscription: null, env });
  }
  return webAssetsEntitlementsFor(env, org.personal_user_id);
}
