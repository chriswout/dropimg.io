export type PaypalMode = "test" | "live";

export type BillingConfig = {
  mode: PaypalMode;
  priceMonthly: string;
  priceAnnual: string;
};

export type CheckoutInterval = "monthly" | "annual";

export type BillingEnv = {
  BILLING_ENABLED?: string;
  PAYPAL_ENV?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_WEBHOOK_ID?: string;
  /** HMAC secret for local/integration tests only. Production uses WEBHOOK_ID. */
  PAYPAL_WEBHOOK_SECRET?: string;
  PAYPAL_PLAN_MONTHLY?: string;
  PAYPAL_PLAN_ANNUAL?: string;
};

export type PaypalWebhookEvent = {
  id: string;
  event_type: string;
  create_time?: string;
  resource?: Record<string, unknown>;
};
