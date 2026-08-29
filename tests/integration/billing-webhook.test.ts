import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { hmacSha256Hex } from "../../src/lib/billing/verify";

const SECRET = "integration-paddle-webhook-secret";
const USER_ID = "9917c3c4-25ba-41b4-9b2d-c2066796bad6";

const workerConfig = {
  configPath: "./wrangler.integration.jsonc",
  secrets: {
    IP_HASH_SECRET: "integration-test-ip-hash-secret",
    ADMIN_TOKEN: "integration-test-admin",
    PADDLE_WEBHOOK_SECRET: SECRET,
  },
  vars: {
    ENVIRONMENT: "development",
    BILLING_ENABLED: "true",
    PADDLE_ENV: "sandbox",
    PADDLE_CLIENT_TOKEN: "test_integration",
    PADDLE_PRICE_MONTHLY: "pri_monthly",
    PADDLE_PRICE_ANNUAL: "pri_annual",
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
  const h1 = await hmacSha256Hex(SECRET, `${ts}:${body}`);
  return worker.fetch("https://dropimg.io/api/billing/paddle/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": `ts=${ts};h1=${h1}`,
    },
    body,
  });
}

describe("Paddle billing webhook", () => {
  it("grants Pro from a signed subscription.created and is idempotent", async () => {
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO users (id, email, email_norm, created_at, updated_at)
       VALUES (?, 'payer@example.com', 'payer@example.com', ?, ?)`,
    )
      .bind(USER_ID, now, now)
      .run();

    const payload = {
      event_id: "evt_01billingtest",
      event_type: "subscription.created",
      data: {
        id: "sub_01billingtest",
        status: "active",
        customer_id: "ctm_01billingtest",
        custom_data: { dropimg_user_id: USER_ID },
        items: [{ price: { id: "pri_monthly" } }],
        current_billing_period: {
          ends_at: new Date((now + 30 * 86400) * 1000).toISOString(),
        },
      },
    };
    const body = JSON.stringify(payload);
    const first = await signedRequest(body);
    expect(first.status).toBe(200);
    const second = await signedRequest(body);
    expect(second.status).toBe(200);
    const dup = (await second.json()) as { duplicate?: boolean };
    expect(dup.duplicate).toBe(true);

    const row = await env.DB.prepare(
      `SELECT user_id, status, provider_subscription_id FROM subscriptions WHERE user_id = ?`,
    )
      .bind(USER_ID)
      .first<{ user_id: string; status: string; provider_subscription_id: string }>();
    expect(row?.status).toBe("active");
    expect(row?.provider_subscription_id).toBe("sub_01billingtest");

    const events = await env.DB.prepare(
      `SELECT COUNT(*) as n FROM billing_events WHERE event_id = ?`,
    )
      .bind("evt_01billingtest")
      .first<{ n: number }>();
    expect(Number(events?.n)).toBe(1);
  });

  it("rejects a bad signature", async () => {
    const res = await worker.fetch("https://dropimg.io/api/billing/paddle/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Paddle-Signature": "ts=1700000000;h1=deadbeef",
      },
      body: JSON.stringify({ event_id: "evt_bad", event_type: "subscription.created", data: {} }),
    });
    expect(res.status).toBe(500);
  });

  it("serves /pro and checkout 401 when signed out", async () => {
    const page = await worker.fetch("https://dropimg.io/pro");
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("DropIMG Pro");
    expect(html).toContain("$1.99");
    expect(html).toContain("$19.99");

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
