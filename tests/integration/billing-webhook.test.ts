import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { hmacSha256Hex } from "../../src/lib/billing/verify";

const SECRET = "whsec_integration_webhook_secret";
const USER_ID = "9917c3c4-25ba-41b4-9b2d-c2066796bad6";

const workerConfig = {
  configPath: "./wrangler.integration.jsonc",
  secrets: {
    IP_HASH_SECRET: "integration-test-ip-hash-secret",
    ADMIN_TOKEN: "integration-test-admin",
    PAYPAL_WEBHOOK_SECRET: SECRET,
    PAYPAL_WEBHOOK_ID: "",
    PAYPAL_CLIENT_ID: "paypal_client_integration",
    PAYPAL_CLIENT_SECRET: "paypal_secret_integration",
  },
  vars: {
    ENVIRONMENT: "development",
    BILLING_ENABLED: "true",
    PAYPAL_ENV: "sandbox",
    PAYPAL_PLAN_MONTHLY: "P-monthly",
    PAYPAL_PLAN_ANNUAL: "P-annual",
    AUTH_FROM_EMAIL: "DropIMG <signin@dropimg.io>",
  },
} as const;

const server = createTestHarness({
  workers: [workerConfig],
});

const worker = server.getWorker("dropimg");

beforeAll(async () => {
  await server.listen();
  await worker.applyD1Migrations("DB");
}, 120_000);

afterEach(async () => {
  await server.reset();
  await worker.applyD1Migrations("DB");
}, 60_000);

afterAll(async () => {
  await server.close();
});

async function signedRequest(body: string, ts = Math.floor(Date.now() / 1000)) {
  const v1 = await hmacSha256Hex(SECRET, `${ts}.${body}`);
  return worker.fetch("https://dropimg.io/api/billing/paypal/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PayPal-Signature": `t=${ts},v1=${v1}`,
    },
    body,
  });
}

async function seedUser(email: string) {
  const env = await worker.getEnv();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO users (id, email, email_norm, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(USER_ID, email, email, now, now)
    .run();
  return { env, now };
}

function isoFromUnix(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

function subscriptionResource(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "I-01billingtest",
    status: "ACTIVE",
    custom_id: USER_ID,
    plan_id: "P-monthly",
    subscriber: { payer_id: "PAYER01BILLING" },
    billing_info: {
      next_billing_time: isoFromUnix(now + 30 * 86400),
    },
    ...overrides,
  };
}

describe("PayPal billing webhook", () => {
  it("grants Pro from a signed BILLING.SUBSCRIPTION.ACTIVATED and is idempotent", async () => {
    const { env, now } = await seedUser("payer@example.com");

    const body = JSON.stringify({
      id: "WH-01billingtest",
      event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
      create_time: isoFromUnix(now),
      resource: subscriptionResource(),
    });

    const first = await signedRequest(body);
    expect(first.status).toBe(200);
    const second = await signedRequest(body);
    expect(second.status).toBe(200);
    expect(((await second.json()) as { duplicate?: boolean }).duplicate).toBe(true);

    const row = await env.DB.prepare(
      `SELECT provider, status, provider_subscription_id, provider_customer_id,
              price_id, current_period_end
       FROM subscriptions WHERE user_id = ?`,
    )
      .bind(USER_ID)
      .first<{
        provider: string;
        status: string;
        provider_subscription_id: string;
        provider_customer_id: string;
        price_id: string;
        current_period_end: number;
      }>();
    expect(row?.provider).toBe("paypal");
    expect(row?.status).toBe("active");
    expect(row?.provider_subscription_id).toBe("I-01billingtest");
    expect(row?.provider_customer_id).toBe("PAYER01BILLING");
    expect(row?.price_id).toBe("P-monthly");
    expect(row?.current_period_end).toBeGreaterThan(now);

    const events = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM billing_events WHERE event_id = ?`,
    )
      .bind("WH-01billingtest")
      .first<{ n: number }>();
    expect(Number(events?.n)).toBe(1);
  });

  it("links the account from a sale that names it", async () => {
    const { env, now } = await seedUser("checkout@example.com");

    const res = await signedRequest(
      JSON.stringify({
        id: "WH-checkout",
        event_type: "PAYMENT.SALE.COMPLETED",
        create_time: isoFromUnix(now),
        resource: {
          id: "sale_test_1",
          custom: USER_ID,
          billing_agreement_id: "I-checkout",
          payer: { payer_id: "PAYERCHECKOUT" },
        },
      }),
    );
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      `SELECT user_id, provider_customer_id FROM subscriptions
       WHERE provider_subscription_id = ?`,
    )
      .bind("I-checkout")
      .first<{ user_id: string; provider_customer_id: string }>();
    expect(row?.user_id).toBe(USER_ID);
    expect(row?.provider_customer_id).toBe("PAYERCHECKOUT");
  });

  /**
   * PayPal often delivers PAYMENT.SALE.COMPLETED before the subscription
   * snapshot. The sale must not stamp the row as newer, or the ACTIVATED
   * event carrying the plan and period looks stale and is dropped.
   */
  it("still records plan and period when the sale is newer and lands first", async () => {
    const { env, now } = await seedUser("race@example.com");

    await signedRequest(
      JSON.stringify({
        id: "WH-race-sale",
        event_type: "PAYMENT.SALE.COMPLETED",
        create_time: isoFromUnix(now + 1),
        resource: {
          id: "sale_race",
          custom: USER_ID,
          billing_agreement_id: "I-01billingtest",
          payer: { payer_id: "PAYERRACE" },
        },
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "WH-race-subscription",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource(),
      }),
    );

    const row = await env.DB.prepare(
      `SELECT price_id, current_period_end, provider_customer_id, status
       FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-01billingtest")
      .first<{
        price_id: string | null;
        current_period_end: number | null;
        provider_customer_id: string;
        status: string;
      }>();
    expect(row?.price_id).toBe("P-monthly");
    expect(row?.current_period_end).toBeGreaterThan(now);
    expect(row?.status).toBe("active");
    expect(row?.provider_customer_id).toBe("PAYER01BILLING");
  });

  it("does not let a late sale revive a cancelled subscription", async () => {
    const { env, now } = await seedUser("late@example.com");

    await signedRequest(
      JSON.stringify({
        id: "WH-deleted",
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ id: "I-late", status: "CANCELLED" }),
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "WH-late-sale",
        event_type: "PAYMENT.SALE.COMPLETED",
        create_time: isoFromUnix(now + 5),
        resource: {
          id: "sale_late",
          custom: USER_ID,
          billing_agreement_id: "I-late",
          payer: { payer_id: "PAYERLATE" },
        },
      }),
    );

    const row = await env.DB.prepare(
      `SELECT status FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-late")
      .first<{ status: string }>();
    expect(row?.status).toBe("canceled");
  });

  it("keeps canceled when an older active update arrives later", async () => {
    const { env, now } = await seedUser("ooo@example.com");

    expect(
      (
        await signedRequest(
          JSON.stringify({
            id: "WH-ooo-canceled",
            event_type: "BILLING.SUBSCRIPTION.CANCELLED",
            create_time: isoFromUnix(now - 10),
            resource: subscriptionResource({ id: "I-ooo", status: "CANCELLED" }),
          }),
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await signedRequest(
          JSON.stringify({
            id: "WH-ooo-updated",
            event_type: "BILLING.SUBSCRIPTION.UPDATED",
            create_time: isoFromUnix(now - 40),
            resource: subscriptionResource({ id: "I-ooo", status: "ACTIVE" }),
          }),
        )
      ).status,
    ).toBe(200);

    const row = await env.DB.prepare(
      `SELECT status FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-ooo")
      .first<{ status: string }>();
    expect(row?.status).toBe("canceled");
  });

  it("rejects a bad signature", async () => {
    const res = await worker.fetch("https://dropimg.io/api/billing/paypal/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PayPal-Signature": `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`,
      },
      body: JSON.stringify({
        id: "WH-bad",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: {},
      }),
    });
    expect(res.status).toBe(400);

    const env = await worker.getEnv();
    const seen = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM billing_events WHERE event_id = 'WH-bad'`,
    ).first<{ n: number }>();
    expect(Number(seen?.n)).toBe(0);
  });

  it("serves /pro and checkout 401 when signed out", async () => {
    const page = await worker.fetch("https://dropimg.io/pro");
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("DropIMG Pro");
    expect(html).toContain("€2.99");
    expect(html).toContain("€24.99");
    expect(html).toContain("Sign in to get Pro");
    expect(html).not.toContain("paddle.js");
    expect(html).not.toContain("Stripe");

    const checkout = await worker.fetch("https://dropimg.io/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://dropimg.io",
      },
      body: JSON.stringify({ interval: "monthly" }),
    });
    expect(checkout.status).toBe(401);
  });
});
