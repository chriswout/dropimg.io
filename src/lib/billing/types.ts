export type StripeMode = "test" | "live";

export type BillingConfig = {
  mode: StripeMode;
  priceMonthly: string;
  priceAnnual: string;
};

export type CheckoutInterval = "monthly" | "annual";

export type BillingEnv = {
  BILLING_ENABLED?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY?: string;
  STRIPE_PRICE_ANNUAL?: string;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  created?: number;
  data: { object: Record<string, unknown> };
};
