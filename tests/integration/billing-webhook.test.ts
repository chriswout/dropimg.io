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
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_SECRET_KEY: "sk_test_integration",
  },
  vars: {
    ENVIRONMENT: "development",
    BILLING_ENABLED: "true",
    STRIPE_PRICE_MONTHLY: "price_monthly",
    STRIPE_PRICE_ANNUAL: "price_annual",
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
  return worker.fetch("https://dropimg.io/api/billing/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${ts},v1=${v1}`,
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

/** Basil puts the billing period on the item, not the subscription. */
function subscriptionObject(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "sub_01billingtest",
    status: "active",
    customer: "cus_01billingtest",
    cancel_at_period_end: false,
    metadata: { dropimg_user_id: USER_ID },
    items: {
      data: [
        {
          price: { id: "price_monthly" },
          current_period_end: now + 30 * 86400,
        },
      ],
    },
    ...overrides,
  };
}

describe("Stripe billing webhook", () => {
  it("grants Pro from a signed customer.subscription.created and is idempotent", async () => {
    const { env, now } = await seedUser("payer@example.com");

    const body = JSON.stringify({
      id: "evt_01billingtest",
      type: "customer.subscription.created",
      created: now,
      data: { object: subscriptionObject() },
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
    expect(row?.provider).toBe("stripe");
    expect(row?.status).toBe("active");
    expect(row?.provider_subscription_id).toBe("sub_01billingtest");
    expect(row?.provider_customer_id).toBe("cus_01billingtest");
    expect(row?.price_id).toBe("price_monthly");
    expect(row?.current_period_end).toBeGreaterThan(now);

    const events = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM billing_events WHERE event_id = ?`,
    )
      .bind("evt_01billingtest")
      .first<{ n: number }>();
    expect(Number(events?.n)).toBe(1);
  });

  it("links the account from a checkout session that names it", async () => {
    const { env, now } = await seedUser("checkout@example.com");

    const res = await signedRequest(
      JSON.stringify({
        id: "evt_checkout",
        type: "checkout.session.completed",
        created: now,
        data: {
          object: {
            id: "cs_test_1",
            client_reference_id: USER_ID,
            customer: "cus_checkout",
            subscription: "sub_checkout",
            payment_status: "paid",
          },
        },
      }),
    );
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      `SELECT user_id, provider_customer_id FROM subscriptions
       WHERE provider_subscription_id = ?`,
    )
      .bind("sub_checkout")
      .first<{ user_id: string; provider_customer_id: string }>();
    expect(row?.user_id).toBe(USER_ID);
    expect(row?.provider_customer_id).toBe("cus_checkout");
  });

  /**
   * Stripe stamps the checkout session a second or so after the subscription
   * it created, and usually delivers it first. The session must not stamp the
   * row as newer, or the subscription event carrying the price and period
   * looks stale and is dropped.
   */
  it("still records price and period when the session is newer and lands first", async () => {
    const { env, now } = await seedUser("race@example.com");

    await signedRequest(
      JSON.stringify({
        id: "evt_race_session",
        type: "checkout.session.completed",
        created: now + 1,
        data: {
          object: {
            id: "cs_race",
            client_reference_id: USER_ID,
            customer: "cus_race",
            subscription: "sub_01billingtest",
            payment_status: "paid",
          },
        },
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "evt_race_subscription",
        type: "customer.subscription.created",
        created: now,
        data: { object: subscriptionObject() },
      }),
    );

    const row = await env.DB.prepare(
      `SELECT price_id, current_period_end, provider_customer_id, status
       FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("sub_01billingtest")
      .first<{
        price_id: string | null;
        current_period_end: number | null;
        provider_customer_id: string;
        status: string;
      }>();
    expect(row?.price_id).toBe("price_monthly");
    expect(row?.current_period_end).toBeGreaterThan(now);
    expect(row?.status).toBe("active");
    expect(row?.provider_customer_id).toBe("cus_01billingtest");
  });

  it("does not let a late checkout session revive a cancelled subscription", async () => {
    const { env, now } = await seedUser("late@example.com");

    await signedRequest(
      JSON.stringify({
        id: "evt_deleted",
        type: "customer.subscription.deleted",
        created: now,
        data: { object: subscriptionObject({ id: "sub_late", status: "canceled" }) },
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "evt_late_checkout",
        type: "checkout.session.completed",
        created: now + 5,
        data: {
          object: {
            id: "cs_test_late",
            client_reference_id: USER_ID,
            customer: "cus_late",
            subscription: "sub_late",
            payment_status: "paid",
          },
        },
      }),
    );

    const row = await env.DB.prepare(
      `SELECT status FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("sub_late")
      .first<{ status: string }>();
    expect(row?.status).toBe("canceled");
  });

  it("keeps canceled when an older active update arrives later", async () => {
    const { env, now } = await seedUser("ooo@example.com");

    expect(
      (
        await signedRequest(
          JSON.stringify({
            id: "evt_ooo_canceled",
            type: "customer.subscription.deleted",
            created: now - 10,
            data: { object: subscriptionObject({ id: "sub_ooo", status: "canceled" }) },
          }),
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await signedRequest(
          JSON.stringify({
            id: "evt_ooo_updated",
            type: "customer.subscription.updated",
            created: now - 40,
            data: { object: subscriptionObject({ id: "sub_ooo", status: "active" }) },
          }),
        )
      ).status,
    ).toBe(200);

    const row = await env.DB.prepare(
      `SELECT status FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("sub_ooo")
      .first<{ status: string }>();
    expect(row?.status).toBe("canceled");
  });

  it("rejects a bad signature", async () => {
    const res = await worker.fetch("https://dropimg.io/api/billing/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`,
      },
      body: JSON.stringify({
        id: "evt_bad",
        type: "customer.subscription.created",
        data: { object: {} },
      }),
    });
    expect(res.status).toBe(400);

    const env = await worker.getEnv();
    const seen = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM billing_events WHERE event_id = 'evt_bad'`,
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
    expect(html).not.toContain("paddle.js");

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
