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
    PAYPAL_WA_DEVELOPER_MONTHLY: "P-wa-dev-m",
    PAYPAL_WA_DEVELOPER_ANNUAL: "P-wa-dev-y",
    PAYPAL_WA_PRO_MONTHLY: "P-wa-pro-m",
    PAYPAL_WA_PRO_ANNUAL: "P-wa-pro-y",
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

  it("stores Web Assets as a separate product from Drop Pro", async () => {
    const { env, now } = await seedUser("wa-payer@example.com");
    const body = JSON.stringify({
      id: "WH-wa-dev",
      event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
      create_time: isoFromUnix(now),
      resource: subscriptionResource({
        id: "I-wa-dev",
        plan_id: "P-wa-dev-m",
      }),
    });
    const res = await signedRequest(body);
    expect(res.status).toBe(200);

    const wa = await env.DB.prepare(
      `SELECT product, price_id, status FROM subscriptions
       WHERE provider_subscription_id = ?`,
    )
      .bind("I-wa-dev")
      .first<{ product: string; price_id: string; status: string }>();
    expect(wa?.product).toBe("web_assets");
    expect(wa?.price_id).toBe("P-wa-dev-m");
    expect(wa?.status).toBe("active");

    const drops = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM subscriptions
       WHERE user_id = ? AND product = 'drops_pro'`,
    )
      .bind(USER_ID)
      .first<{ n: number }>();
    expect(Number(drops?.n)).toBe(0);
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

  it("fails closed on an unknown PayPal plan id", async () => {
    const { env, now } = await seedUser("unknown-plan@example.com");
    const res = await signedRequest(
      JSON.stringify({
        id: "WH-unknown-plan",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ plan_id: "P-not-in-catalog" }),
      }),
    );
    expect(res.status).toBe(200);

    const subs = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ?`,
    )
      .bind(USER_ID)
      .first<{ n: number }>();
    expect(Number(subs?.n)).toBe(0);

    const events = await env.DB.prepare(
      `SELECT status FROM billing_events WHERE event_id = ?`,
    )
      .bind("WH-unknown-plan")
      .first<{ status: string }>();
    expect(events?.status).toBe("processed");
  });

  it("does not map a Web Assets plan onto Drops Pro", async () => {
    const { env, now } = await seedUser("mismatch@example.com");
    const res = await signedRequest(
      JSON.stringify({
        id: "WH-wa-not-drops",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({
          id: "I-wa-not-drops",
          plan_id: "P-wa-pro-m",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const row = await env.DB.prepare(
      `SELECT product, price_id FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-wa-not-drops")
      .first<{ product: string; price_id: string }>();
    expect(row?.product).toBe("web_assets");
    expect(row?.price_id).toBe("P-wa-pro-m");
    const drops = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ? AND product = 'drops_pro'`,
    )
      .bind(USER_ID)
      .first<{ n: number }>();
    expect(Number(drops?.n)).toBe(0);
  });

  it("keeps paid-through access after CANCELLED without next_billing_time", async () => {
    const { env, now } = await seedUser("paid-through@example.com");
    const periodEnd = now + 20 * 86400;
    await signedRequest(
      JSON.stringify({
        id: "WH-paid-activated",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({
          id: "I-paid-through",
          billing_info: { next_billing_time: isoFromUnix(periodEnd) },
        }),
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "WH-paid-cancelled",
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        create_time: isoFromUnix(now + 60),
        resource: {
          id: "I-paid-through",
          status: "CANCELLED",
          custom_id: USER_ID,
          plan_id: "P-monthly",
          subscriber: { payer_id: "PAYER01BILLING" },
        },
      }),
    );

    const row = await env.DB.prepare(
      `SELECT status, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-paid-through")
      .first<{
        status: string;
        current_period_end: number;
        cancel_at_period_end: number;
      }>();
    expect(row?.status).toBe("canceled");
    expect(row?.current_period_end).toBeGreaterThan(now);
    expect(row?.cancel_at_period_end).toBe(1);
  });

  it("stores EXPIRED as expired and does not keep a future period end", async () => {
    const { env, now } = await seedUser("expired-term@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-exp-activated",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now - 40),
        resource: subscriptionResource({
          id: "I-expired",
          billing_info: { next_billing_time: isoFromUnix(now + 86400) },
        }),
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "WH-exp-expired",
        event_type: "BILLING.SUBSCRIPTION.EXPIRED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({
          id: "I-expired",
          status: "EXPIRED",
          billing_info: {},
        }),
      }),
    );
    const row = await env.DB.prepare(
      `SELECT status, current_period_end FROM subscriptions
       WHERE provider_subscription_id = ?`,
    )
      .bind("I-expired")
      .first<{ status: string; current_period_end: number }>();
    expect(row?.status).toBe("expired");
    expect(row?.current_period_end).toBeLessThanOrEqual(now);
  });

  it("records PAYMENT.FAILED without changing entitlement", async () => {
    const { env, now } = await seedUser("payfail@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-fail-activated",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ id: "I-payfail" }),
      }),
    );
    const res = await signedRequest(
      JSON.stringify({
        id: "WH-fail-payment",
        event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        create_time: isoFromUnix(now + 1),
        resource: {
          id: "I-payfail",
          custom_id: USER_ID,
          plan_id: "P-monthly",
        },
      }),
    );
    expect(res.status).toBe(200);
    const row = await env.DB.prepare(
      `SELECT status FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-payfail")
      .first<{ status: string }>();
    expect(row?.status).toBe("active");
  });

  it("records a sale payment once and ignores webhook replay", async () => {
    const { env, now } = await seedUser("history@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-hist-act",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ id: "I-hist" }),
      }),
    );
    const sale = JSON.stringify({
      id: "WH-hist-sale",
      event_type: "PAYMENT.SALE.COMPLETED",
      create_time: isoFromUnix(now),
      resource: {
        id: "SALEHIST1",
        custom: USER_ID,
        billing_agreement_id: "I-hist",
        amount: { total: "2.99", currency: "EUR" },
        payer: { payer_id: "PAYERHIST" },
      },
    });
    expect((await signedRequest(sale)).status).toBe(200);
    expect((await signedRequest(sale)).status).toBe(200);

    const payments = await env.DB.prepare(
      `SELECT COUNT(*) AS n, product, amount, currency, status
       FROM billing_payments WHERE user_id = ?`,
    )
      .bind(USER_ID)
      .first<{ n: number; product: string; amount: string; currency: string; status: string }>();
    expect(Number(payments?.n)).toBe(1);
    expect(payments?.product).toBe("drops_pro");
    expect(payments?.amount).toBe("2.99");
    expect(payments?.currency).toBe("EUR");
    expect(payments?.status).toBe("paid");
    const receipts = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM billing_notifications
       WHERE event_id = ? AND notification_type = 'payment_receipt'`,
    )
      .bind("WH-hist-sale")
      .first<{ n: number }>();
    expect(Number(receipts?.n)).toBe(1);
  });

  it("records a refunded payment and one refund receipt notice", async () => {
    const { env, now } = await seedUser("refund@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-ref-act",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ id: "I-ref" }),
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "WH-ref-sale",
        event_type: "PAYMENT.SALE.COMPLETED",
        create_time: isoFromUnix(now),
        resource: {
          id: "SALEREF1",
          custom: USER_ID,
          billing_agreement_id: "I-ref",
          amount: { total: "2.99", currency: "EUR" },
        },
      }),
    );
    const refund = JSON.stringify({
      id: "WH-ref-back",
      event_type: "PAYMENT.SALE.REFUNDED",
      create_time: isoFromUnix(now + 10),
      resource: {
        id: "SALEREF1",
        custom: USER_ID,
        billing_agreement_id: "I-ref",
        amount: { total: "2.99", currency: "EUR" },
      },
    });
    expect((await signedRequest(refund)).status).toBe(200);
    expect((await signedRequest(refund)).status).toBe(200);
    const row = await env.DB.prepare(
      `SELECT status FROM billing_payments WHERE provider_transaction_id = ?`,
    )
      .bind("SALEREF1")
      .first<{ status: string }>();
    expect(row?.status).toBe("refunded");
    const notes = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM billing_notifications
       WHERE event_id = ? AND notification_type = 'payment_refunded'`,
    )
      .bind("WH-ref-back")
      .first<{ n: number }>();
    expect(Number(notes?.n)).toBe(1);
  });

  it("sends one failed-payment notification and ignores replay", async () => {
    const { env, now } = await seedUser("dunning@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-dun-act",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ id: "I-dun", plan_id: "P-wa-dev-m" }),
      }),
    );
    const failed = JSON.stringify({
      id: "WH-dun-fail",
      event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      create_time: isoFromUnix(now),
      resource: subscriptionResource({
        id: "I-dun",
        plan_id: "P-wa-dev-m",
        status: "ACTIVE",
      }),
    });
    expect((await signedRequest(failed)).status).toBe(200);
    expect((await signedRequest(failed)).status).toBe(200);
    const notes = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM billing_notifications
       WHERE event_id = ? AND notification_type = 'payment_failed'`,
    )
      .bind("WH-dun-fail")
      .first<{ n: number }>();
    expect(Number(notes?.n)).toBe(1);
  });

  it("records suspension and recovery notifications", async () => {
    const { env, now } = await seedUser("recover@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-rec-act",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({ id: "I-rec" }),
      }),
    );
    expect(
      (
        await signedRequest(
          JSON.stringify({
            id: "WH-rec-sus",
            event_type: "BILLING.SUBSCRIPTION.SUSPENDED",
            create_time: isoFromUnix(now + 1),
            resource: subscriptionResource({ id: "I-rec", status: "SUSPENDED" }),
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await signedRequest(
          JSON.stringify({
            id: "WH-rec-ok",
            event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
            create_time: isoFromUnix(now + 2),
            resource: subscriptionResource({ id: "I-rec", status: "ACTIVE" }),
          }),
        )
      ).status,
    ).toBe(200);

    const types = await env.DB.prepare(
      `SELECT notification_type FROM billing_notifications WHERE user_id = ? ORDER BY sent_at`,
    )
      .bind(USER_ID)
      .all<{ notification_type: string }>();
    expect((types.results ?? []).map((r) => r.notification_type)).toEqual([
      "subscription_suspended",
      "payment_recovered",
    ]);
  });

  it("keeps the entitled plan when PayPal revises plan_id before period end", async () => {
    const { env, now } = await seedUser("revise-hook@example.com");
    await signedRequest(
      JSON.stringify({
        id: "WH-rev-act",
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        create_time: isoFromUnix(now),
        resource: subscriptionResource({
          id: "I-rev",
          plan_id: "P-wa-dev-m",
        }),
      }),
    );
    await signedRequest(
      JSON.stringify({
        id: "WH-rev-upd",
        event_type: "BILLING.SUBSCRIPTION.UPDATED",
        create_time: isoFromUnix(now + 5),
        resource: subscriptionResource({
          id: "I-rev",
          plan_id: "P-wa-pro-m",
          billing_info: { next_billing_time: isoFromUnix(now + 20 * 86400) },
        }),
      }),
    );
    const row = await env.DB.prepare(
      `SELECT price_id, pending_price_id, pending_effective_at FROM subscriptions
       WHERE provider_subscription_id = ?`,
    )
      .bind("I-rev")
      .first<{
        price_id: string;
        pending_price_id: string | null;
        pending_effective_at: number | null;
      }>();
    expect(row?.price_id).toBe("P-wa-dev-m");
    expect(row?.pending_price_id).toBe("P-wa-pro-m");
    expect(row?.pending_effective_at).toBeGreaterThan(now);
  });

  it("serves /pro and checkout 401 when signed out", async () => {
    const page = await worker.fetch("https://dropimg.io/pro");
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("Drops Pro");
    expect(html).toContain("€2.99");
    expect(html).toContain("€24.99");
    expect(html).toContain("Sign in to get Drops Pro");
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
