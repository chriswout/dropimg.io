import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

const workerConfig = {
  configPath: "./wrangler.integration.jsonc",
  secrets: {
    IP_HASH_SECRET: "integration-test-ip-hash-secret",
    ADMIN_TOKEN: "integration-test-admin",
    PAYPAL_WEBHOOK_SECRET: "whsec_unused_here",
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

function cookieFrom(res: Response): string {
  const set = res.headers.get("Set-Cookie") || "";
  const m = /dropimg_session=([^;]+)/.exec(set);
  expect(m).toBeTruthy();
  return `dropimg_session=${m![1]}`;
}

async function signIn(email: string): Promise<{ cookie: string; userId: string }> {
  const started = await worker.fetch("https://dropimg.io/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "CF-Connecting-IP": "198.51.100.77",
    },
    body: JSON.stringify({ email }),
  });
  const body = (await started.json()) as { devMagicUrl?: string };
  const cb = await worker.fetch(body.devMagicUrl!, { redirect: "manual" });
  const cookie = cookieFrom(cb);
  const me = await worker.fetch("https://dropimg.io/api/account/me", {
    headers: { Cookie: cookie },
  });
  const user = (await me.json()) as { user: { id: string } };
  return { cookie, userId: user.user.id };
}

async function seedSubscription(
  userId: string,
  row: {
    id: string;
    product: "drops_pro" | "web_assets";
    status: string;
    priceId: string;
    periodEnd: number | null;
    cancelAtPeriodEnd?: number;
  },
) {
  const env = await worker.getEnv();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO subscriptions (
       id, user_id, provider, provider_subscription_id, status, price_id, product,
       current_period_end, cancel_at_period_end, created_at, updated_at
     ) VALUES (?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      userId,
      row.id,
      row.status,
      row.priceId,
      row.product,
      row.periodEnd,
      row.cancelAtPeriodEnd ?? 0,
      now,
      now,
    )
    .run();
}

describe("billing portal", () => {
  it("shows Free copy when the account has no subscriptions", async () => {
    const { cookie } = await signIn("portal-free@example.com");
    const res = await worker.fetch("https://dropimg.io/app/billing", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Web Assets Free");
    expect(html).toContain("Drops Free");
    expect(html).toContain("No payments yet.");
    expect(html).not.toContain('id="billing-cancel-wa"');
    expect(html).not.toContain('id="billing-cancel-drops"');
  });

  it("renders Web Assets Developer, Drops Pro, and both together", async () => {
    const { cookie, userId } = await signIn("portal-both@example.com");
    const end = Math.floor(Date.now() / 1000) + 20 * 86400;
    await seedSubscription(userId, {
      id: "I-portalwa",
      product: "web_assets",
      status: "active",
      priceId: "P-wa-dev-m",
      periodEnd: end,
    });
    await seedSubscription(userId, {
      id: "I-portaldrops",
      product: "drops_pro",
      status: "active",
      priceId: "P-monthly",
      periodEnd: end,
    });
    const html = await (
      await worker.fetch("https://dropimg.io/app/billing", { headers: { Cookie: cookie } })
    ).text();
    expect(html).toContain("Web Assets Developer");
    expect(html).toContain("Drops Pro");
    expect(html).toContain("Change plan");
    expect(html).toContain("Cancel renewal");
    expect(html).toContain("Manage in PayPal");
  });

  it("renders annual Pro, canceled paid-through, suspended, and expired", async () => {
    const { cookie, userId } = await signIn("portal-states@example.com");
    const end = Math.floor(Date.now() / 1000) + 20 * 86400;
    await seedSubscription(userId, {
      id: "I-wa-annual",
      product: "web_assets",
      status: "canceled",
      priceId: "P-wa-pro-y",
      periodEnd: end,
      cancelAtPeriodEnd: 1,
    });
    await seedSubscription(userId, {
      id: "I-drops-sus",
      product: "drops_pro",
      status: "suspended",
      priceId: "P-monthly",
      periodEnd: end,
    });
    const html = await (
      await worker.fetch("https://dropimg.io/app/billing", { headers: { Cookie: cookie } })
    ).text();
    expect(html).toContain("Web Assets Pro — $290/year");
    expect(html).toContain("Cancels at period end");
    expect(html).toContain("Suspended");
    expect(html).not.toContain('id="billing-change-wa"');
  });

  it("lists only the signed-in user's payment history", async () => {
    const a = await signIn("pay-a@example.com");
    const b = await signIn("pay-b@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO billing_payments (
         id, user_id, subscription_id, product, plan_id, provider,
         provider_transaction_id, amount, currency, status, paid_at, created_at
       ) VALUES (?, ?, 'I-a', 'web_assets', 'P-wa-dev-m', 'paypal', 'TX-A', '9.00', 'USD', 'paid', ?, ?)`,
    )
      .bind("web_assets:TX-A", a.userId, now, now)
      .run();
    await env.DB.prepare(
      `INSERT INTO billing_payments (
         id, user_id, subscription_id, product, plan_id, provider,
         provider_transaction_id, amount, currency, status, paid_at, created_at
       ) VALUES (?, ?, 'I-b', 'drops_pro', 'P-monthly', 'paypal', 'TX-B', '2.99', 'EUR', 'paid', ?, ?)`,
    )
      .bind("drops_pro:TX-B", b.userId, now, now)
      .run();

    const htmlA = await (
      await worker.fetch("https://dropimg.io/app/billing", { headers: { Cookie: a.cookie } })
    ).text();
    const htmlB = await (
      await worker.fetch("https://dropimg.io/app/billing", { headers: { Cookie: b.cookie } })
    ).text();
    expect(htmlA).toContain("$9.00");
    expect(htmlA).not.toContain("€2.99");
    expect(htmlB).toContain("€2.99");
    expect(htmlB).not.toContain("$9.00");
  });
});

describe("plan change and cancel endpoints", () => {
  it("rejects anonymous, CSRF, unknown, and mismatched plans", async () => {
    const anon = await worker.fetch("https://dropimg.io/api/billing/revise", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://dropimg.io" },
      body: JSON.stringify({ product: "web_assets", plan: "pro", interval: "monthly" }),
    });
    expect(anon.status).toBe(401);

    const { cookie } = await signIn("revise-auth@example.com");
    const csrf = await worker.fetch("https://dropimg.io/api/billing/revise", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ product: "web_assets", plan: "pro", interval: "monthly" }),
    });
    expect(csrf.status).toBe(403);

    const unknown = await worker.fetch("https://dropimg.io/api/billing/revise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://dropimg.io",
        Cookie: cookie,
      },
      body: JSON.stringify({ product: "web_assets", plan: "enterprise", interval: "monthly" }),
    });
    expect(unknown.status).toBe(400);
  });

  it("blocks revise and cancel on canceled or suspended rows", async () => {
    const { cookie, userId } = await signIn("revise-block@example.com");
    await seedSubscription(userId, {
      id: "I-blocked",
      product: "web_assets",
      status: "suspended",
      priceId: "P-wa-dev-m",
      periodEnd: Math.floor(Date.now() / 1000) + 86400,
    });
    const revise = await worker.fetch("https://dropimg.io/api/billing/revise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://dropimg.io",
        Cookie: cookie,
      },
      body: JSON.stringify({ product: "web_assets", plan: "pro", interval: "monthly" }),
    });
    expect(revise.status).toBe(409);

    const cancel = await worker.fetch("https://dropimg.io/api/billing/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://dropimg.io",
        Cookie: cookie,
      },
      body: JSON.stringify({ product: "web_assets" }),
    });
    expect(cancel.status).toBe(409);
  });

  it("does not let a user cancel another account's product by supplying an id", async () => {
    const owner = await signIn("owner-cancel@example.com");
    const other = await signIn("other-cancel@example.com");
    await seedSubscription(owner.userId, {
      id: "I-owner",
      product: "web_assets",
      status: "active",
      priceId: "P-wa-dev-m",
      periodEnd: Math.floor(Date.now() / 1000) + 86400,
    });
    const res = await worker.fetch("https://dropimg.io/api/billing/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://dropimg.io",
        Cookie: other.cookie,
      },
      body: JSON.stringify({ product: "web_assets", subscription_id: "I-owner" }),
    });
    expect(res.status).toBe(409);
    const env = await worker.getEnv();
    const row = await env.DB.prepare(
      `SELECT status FROM subscriptions WHERE provider_subscription_id = ?`,
    )
      .bind("I-owner")
      .first<{ status: string }>();
    expect(row?.status).toBe("active");
  });
});
