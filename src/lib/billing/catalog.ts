import type { BillingProduct, CheckoutInterval, WebAssetsPaidPlan } from "./types";

export type AdvertisedPrice = {
  amount: string;
  currency: "EUR" | "USD";
  interval: CheckoutInterval;
};

export const DROPS_PRO_PRICES: Record<CheckoutInterval, AdvertisedPrice> = {
  monthly: { amount: "2.99", currency: "EUR", interval: "monthly" },
  annual: { amount: "24.99", currency: "EUR", interval: "annual" },
};

export const WEB_ASSETS_PRICES: Record<
  WebAssetsPaidPlan,
  Record<CheckoutInterval, AdvertisedPrice>
> = {
  developer: {
    monthly: { amount: "9.00", currency: "USD", interval: "monthly" },
    annual: { amount: "90.00", currency: "USD", interval: "annual" },
  },
  pro: {
    monthly: { amount: "29.00", currency: "USD", interval: "monthly" },
    annual: { amount: "290.00", currency: "USD", interval: "annual" },
  },
};

export function formatAdvertisedAmount(price: AdvertisedPrice): string {
  const amount = price.amount.replace(/\.00$/, "");
  if (price.currency === "EUR") return `€${amount}`;
  return `$${amount}`;
}

export function formatAdvertisedPrice(price: AdvertisedPrice): string {
  const period = price.interval === "annual" ? "year" : "month";
  return `${formatAdvertisedAmount(price)}/${period}`;
}

export function formatMoney(amount: string, currency: string): string {
  const cur = currency.trim().toUpperCase();
  const value = amount.trim();
  if (cur === "EUR") return `€${value}`;
  if (cur === "USD") return `$${value}`;
  return `${value} ${cur}`;
}

export function dropsProLabel(interval: CheckoutInterval | null): string {
  if (interval === "annual") return `Drops Pro — ${formatAdvertisedPrice(DROPS_PRO_PRICES.annual)}`;
  if (interval === "monthly") return `Drops Pro — ${formatAdvertisedPrice(DROPS_PRO_PRICES.monthly)}`;
  return "Drops Pro";
}

export function webAssetsPaidLabel(
  plan: WebAssetsPaidPlan,
  interval: CheckoutInterval,
): string {
  const price = WEB_ASSETS_PRICES[plan][interval];
  const name = plan === "pro" ? "Pro" : "Developer";
  return `Web Assets ${name} — ${formatAdvertisedPrice(price)}`;
}

export function productTitle(product: BillingProduct): string {
  return product === "web_assets" ? "Web Assets" : "Drops Pro";
}

export function nextChargeLabel(price: AdvertisedPrice): string {
  const symbol = price.currency === "EUR" ? "€" : "$";
  return `${symbol}${price.amount} ${price.currency}`;
}
