import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import type { UploadResponse } from "../../src/types";

const PNG_1x1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const server = createTestHarness({
  workers: [
    {
      configPath: "./wrangler.integration.jsonc",
      secrets: {
        IP_HASH_SECRET: "integration-test-ip-hash-secret",
        ADMIN_TOKEN: "integration-test-admin",
        /**
         * Blanked on purpose. The harness would otherwise inherit the real key
         * from .dev.vars and delete-account would reach out to Stripe, which
         * makes the suite need the network and depend on a live account.
         */
        STRIPE_SECRET_KEY: "",
      },
      vars: {
        ENVIRONMENT: "development",
        LONG_TTL_ENABLED: "false",
        PRO_50MB_ENABLED: "false",
      },
    },
  ],
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
      "CF-Connecting-IP": "198.51.100.95",
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

async function claimOne(cookie: string): Promise<string> {
  const up = await worker.fetch("https://dropimg.io/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "CF-Connecting-IP": "203.0.113.90",
    },
    body: PNG_1x1,
  });
  const uploaded = (await up.json()) as UploadResponse;
  await worker.fetch("https://dropimg.io/api/account/claim", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://dropimg.io",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ slug: uploaded.slug, deleteToken: uploaded.deleteToken }],
    }),
  });
  return uploaded.slug;
}

describe("Account deletion", () => {
  it("tombstones images, anonymizes the user, and revokes sessions", async () => {
    const { cookie, userId } = await signIn("delete-free@example.com");
    const slug = await claimOne(cookie);
    const tokenRes = await worker.fetch("https://dropimg.io/api/account/integrations", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label: "Chrome extension", kind: "extension" }),
    });
    const created = (await tokenRes.json()) as { token: string };
    expect(tokenRes.status).toBe(200);

    const del = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://dropimg.io" },
    });
    expect(del.status).toBe(200);

    const env = await worker.getEnv();
    const image = await env.DB.prepare(
      `SELECT deleted_at, r2_key FROM images WHERE slug = ?`,
    )
      .bind(slug)
      .first<{ deleted_at: number | null; r2_key: string }>();
    expect(image?.deleted_at).toBeTruthy();
    expect(image?.r2_key).toBe("");

    const user = await env.DB.prepare(
      `SELECT email_norm, deleted_at FROM users WHERE id = ?`,
    )
      .bind(userId)
      .first<{ email_norm: string; deleted_at: number | null }>();
    expect(user?.deleted_at).toBeTruthy();
    expect(user?.email_norm).toBe(`deleted.${userId}@deleted.dropimg.invalid`);

    const me = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const body = (await me.json()) as { user: unknown };
    expect(body.user).toBeNull();

    const still = await worker.fetch("https://dropimg.io/api/integrations/me", {
      headers: { Authorization: `Bearer ${created.token}` },
    });
    expect(still.status).toBe(401);
    const tokens = await env.DB.prepare(
      `SELECT revoked_at FROM integration_tokens WHERE user_id = ?`,
    )
      .bind(userId)
      .all<{ revoked_at: number | null }>();
    expect(tokens.results?.length).toBe(1);
    expect(tokens.results?.[0]?.revoked_at).toBeTruthy();
  });

  it("stops deletion when a live Stripe subscription cannot be canceled", async () => {
    const { cookie, userId } = await signIn("delete-pro@example.com");
    const slug = await claimOne(cookie);
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, provider_subscription_id, status,
         current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'stripe', ?, 'active', ?, 0, ?, ?)`,
    )
      .bind(`sub-${userId}`, userId, "sub_live_cannot_cancel", now + 86400, now, now)
      .run();

    const del = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://dropimg.io" },
    });
    expect([409, 502]).toContain(del.status);
    const err = (await del.json()) as { error?: string };
    expect(err.error).toMatch(/couldn'?t cancel your Pro subscription/i);

    const user = await env.DB.prepare(
      `SELECT deleted_at, email_norm FROM users WHERE id = ?`,
    )
      .bind(userId)
      .first<{ deleted_at: number | null; email_norm: string }>();
    expect(user?.deleted_at).toBeNull();
    expect(user?.email_norm).toBe("delete-pro@example.com");

    const image = await env.DB.prepare(
      `SELECT deleted_at FROM images WHERE slug = ?`,
    )
      .bind(slug)
      .first<{ deleted_at: number | null }>();
    expect(image?.deleted_at).toBeNull();

    const me = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const body = (await me.json()) as { user: { id: string } | null };
    expect(body.user?.id).toBe(userId);
  });
});
