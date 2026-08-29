export type PaddleEnvironment = "sandbox" | "production";

export type BillingConfig = {
  env: PaddleEnvironment;
  clientToken: string;
  priceMonthly: string;
  priceAnnual: string;
};

export type CheckoutInterval = "monthly" | "annual";

export type BillingEnv = {
  BILLING_ENABLED?: string;
  PADDLE_ENV?: string;
  PADDLE_CLIENT_TOKEN?: string;
  PADDLE_PRICE_MONTHLY?: string;
  PADDLE_PRICE_ANNUAL?: string;
  PADDLE_API_KEY?: string;
  PADDLE_WEBHOOK_SECRET?: string;
};

export type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  occurred_at?: string;
  data: Record<string, unknown>;
};
