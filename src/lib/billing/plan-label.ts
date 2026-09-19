import type { BillingEnv } from "./types";
import { billingProductForPriceId, intervalForPrice } from "./paypal";
import { webAssetsPlanForPriceId } from "../web-assets-entitlements";
import { dropsProLabel, webAssetsPaidLabel } from "./catalog";

export function catalogForPriceIdLocal(
  env: BillingEnv,
  priceId: string | null | undefined,
): string | null {
  const product = billingProductForPriceId(env, priceId);
  const interval = intervalForPrice(env, priceId);
  if (!product || !interval) return null;
  if (product === "drops_pro") return dropsProLabel(interval);
  const mapped = webAssetsPlanForPriceId(env, priceId);
  if (!mapped) return null;
  return webAssetsPaidLabel(mapped.plan, mapped.interval);
}
