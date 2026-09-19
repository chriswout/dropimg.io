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
      "CF-Connecting-IP": "198.51.100.40",
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
    updatedAt?: number;
  },
) {
  const env = await worker.getEnv();
  const now = Math.floor(Date.now() / 1000);
  const updated = row.updatedAt ?? now;
  await env.DB.prepare(
    `INSERT INTO subscriptions (
       id, user_id, provider, provider_subscription_id, status, price_id, product,
       current_period_end, cancel_at_period_end, created_at, updated_at
     ) VALUES (?, ?, 'paypal', ?, ?, ?, ?, ?, 0, ?, ?)`,
  )
    .bind(
      row.id,
      userId,
      row.id,
      row.status,
      row.priceId,
      row.product,
      row.periodEnd,
      updated,
      updated,
    )
    .run();
}

async function checkout(
  cookie: string,
  path: string,
  body: Record<string, string>,
) {
  return worker.fetch(`https://dropimg.io${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://dropimg.io",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

async function subscriptionCount(userId: string, product?: string) {
  const env = await worker.getEnv();
  const row = product
    ? await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ? AND product = ?`,
      )
        .bind(userId, product)
        .first<{ n: number }>()
    : await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ?`,
      )
        .bind(userId)
        .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

describe("PayPal checkout guards", () => {
  it("blocks a second Drops Pro click while checkout is already in progress", async () => {
    const { cookie, userId } = await signIn("dup-pending@example.com");
    const now = Math.floor(Date.now() / 1000);
    await seedSubscription(userId, {
      id: `pending:drops_pro:${userId}`,
      product: "drops_pro",
      status: "approval_pending",
      priceId: "P-monthly",
      periodEnd: null,
      updatedAt: now,
    });

    const first = await checkout(cookie, "/api/billing/checkout", {
      interval: "monthly",
    });
    const second = await checkout(cookie, "/api/billing/checkout", {
      interval: "annual",
    });
    expect(first.status).toBe(409);
    expect(second.status).toBe(409);
    const body = (await first.json()) as { code?: string };
    expect(body.code).toBe("checkout_in_progress");
    expect(await subscriptionCount(userId, "drops_pro")).toBe(1);
  });

  it("refuses a new Drops Pro checkout when one is already active", async () => {
    const { cookie, userId } = await signIn("dup-active@example.com");
    await seedSubscription(userId, {
      id: "I-alreadypro",
      product: "drops_pro",
      status: "active",
      priceId: "P-monthly",
      periodEnd: Math.floor(Date.now() / 1000) + 86400,
    });

    const res = await checkout(cookie, "/api/billing/checkout", {
      interval: "monthly",
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code?: string }).code).toBe("already_subscribed");
    expect(await subscriptionCount(userId, "drops_pro")).toBe(1);
  });

  it("blocks Web Assets Pro checkout while Developer is live", async () => {
    const { cookie, userId } = await signIn("wa-change@example.com");
    await seedSubscription(userId, {
      id: "I-wadevm",
      product: "web_assets",
      status: "active",
      priceId: "P-wa-dev-m",
      periodEnd: Math.floor(Date.now() / 1000) + 86400,
    });

    const first = await checkout(cookie, "/api/billing/web-assets/checkout", {
      plan: "pro",
      interval: "monthly",
    });
    const second = await checkout(cookie, "/api/billing/web-assets/checkout", {
      plan: "pro",
      interval: "annual",
    });
    expect(first.status).toBe(409);
    expect(second.status).toBe(409);
    expect(((await first.json()) as { code?: string }).code).toBe(
      "plan_change_blocked",
    );
    expect(await subscriptionCount(userId, "web_assets")).toBe(1);
    expect(await subscriptionCount(userId, "drops_pro")).toBe(0);
  });
});
