import { execFileSync } from "node:child_process";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

let ipCounter = 40;

export async function signInBilling(page: Page, request: APIRequestContext, email: string) {
  const ip = `203.0.113.${(ipCounter++ % 200) + 20}`;
  await page.context().setExtraHTTPHeaders({ "CF-Connecting-IP": ip });
  const started = await request.post("/login", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
    data: { email },
  });
  expect(started.ok()).toBeTruthy();
  const body = (await started.json()) as { devMagicUrl?: string };
  await page.goto(new URL(body.devMagicUrl!).pathname + new URL(body.devMagicUrl!).search);
  const me = await page.request.get("/api/account/me");
  const json = (await me.json()) as { user: { id: string } };
  expect(json.user?.id).toBeTruthy();
  return json.user.id;
}

/** Sandbox catalog IDs from local `.dev.vars` / docs/paypal.md. */
export const E2E_PLANS = {
  dropsMonthly: "P-15G50054531033903NKPD7ZI",
  dropsAnnual: "P-7F863114YW191224BNKPD7ZQ",
  waDevMonthly: "P-8LH706826P153202CNKV6BCI",
  waDevAnnual: "P-8VU25673PE447042MNKV6BCQ",
  waProMonthly: "P-3JV643758U3795743NKV6BCQ",
  waProAnnual: "P-6M302061UF3384325NKV6BCY",
} as const;

export function seedLocalBilling(sql: string) {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "dropimg", "--local", "--command", sql],
    { stdio: "pipe" },
  );
}

export function insertSubscription(opts: {
  userId: string;
  id: string;
  product: "drops_pro" | "web_assets";
  status: string;
  priceId: string;
  periodEnd: number | null;
  cancelAtPeriodEnd?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  seedLocalBilling(
    `INSERT INTO subscriptions (
       id, user_id, provider, provider_subscription_id, status, price_id, product,
       current_period_end, cancel_at_period_end, created_at, updated_at
     ) VALUES (
       '${opts.id}', '${opts.userId}', 'paypal', '${opts.id}', '${opts.status}',
       '${opts.priceId}', '${opts.product}', ${opts.periodEnd ?? "NULL"},
       ${opts.cancelAtPeriodEnd ?? 0}, ${now}, ${now}
     );`,
  );
}

export function insertPayment(opts: {
  userId: string;
  id: string;
  product: "drops_pro" | "web_assets";
  planId: string;
  amount: string;
  currency: string;
  status?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  seedLocalBilling(
    `INSERT INTO billing_payments (
       id, user_id, subscription_id, product, plan_id, provider,
       provider_transaction_id, amount, currency, status, paid_at, created_at
     ) VALUES (
       '${opts.id}', '${opts.userId}', 'I-e2e', '${opts.product}', '${opts.planId}',
       'paypal', '${opts.id}', '${opts.amount}', '${opts.currency}',
       '${opts.status ?? "paid"}', ${now}, ${now}
     );`,
  );
}
