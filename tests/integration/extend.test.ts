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

const EXPIRY_7D = 7 * 24 * 60 * 60;
const EXPIRY_30D = 30 * 24 * 60 * 60;

const server = createTestHarness({
  workers: [
    {
      configPath: "./wrangler.integration.jsonc",
      secrets: {
        IP_HASH_SECRET: "integration-test-ip-hash-secret",
        ADMIN_TOKEN: "integration-test-admin",
      },
      vars: {
        ENVIRONMENT: "development",
        LONG_TTL_ENABLED: "true",
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
      "CF-Connecting-IP": "198.51.100.91",
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

async function makePro(userId: string): Promise<void> {
  const env = await worker.getEnv();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO subscriptions
      (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
     VALUES (?, ?, 'paddle', 'active', ?, 0, ?, ?)`,
  )
    .bind(`sub-${userId}`, userId, now + 86400, now, now)
    .run();
}

describe("Pro expiry + extend", () => {
  it("accepts 7d Pro uploads on o/pro and extend copies claimed 24h objects first", async () => {
    const { cookie, userId } = await signIn("pro-extend@example.com");
    await makePro(userId);

    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: EXPIRY_7D }),
    });
    expect(intent.status).toBe(200);
    const created = (await intent.json()) as { uploadUrl: string };

    const up = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.71",
      },
      body: PNG_1x1,
    });
    expect(up.status).toBe(201);
    const uploaded = (await up.json()) as UploadResponse;

    const env = await worker.getEnv();
    const row = await env.DB.prepare(
      `SELECT r2_key, created_at, expires_at FROM images WHERE slug = ?`,
    )
      .bind(uploaded.slug)
      .first<{ r2_key: string; created_at: number; expires_at: number }>();
    expect(row?.r2_key.startsWith("o/pro/")).toBe(true);
    expect(row!.expires_at - row!.created_at).toBe(EXPIRY_7D);

    const claimed = await worker.fetch("https://dropimg.io/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.72",
      },
      body: PNG_1x1,
    });
    const anon = (await claimed.json()) as UploadResponse;
    await worker.fetch("https://dropimg.io/api/account/claim", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ slug: anon.slug, deleteToken: anon.deleteToken }],
      }),
    });

    const before = await env.DB.prepare(
      `SELECT r2_key, expires_at, created_at FROM images WHERE slug = ?`,
    )
      .bind(anon.slug)
      .first<{ r2_key: string; expires_at: number; created_at: number }>();
    expect(before?.r2_key.startsWith("o/24h/")).toBe(true);
    const expiresBefore = before!.expires_at;

    const extend = await worker.fetch(
      `https://dropimg.io/api/account/images/${anon.slug}/extend`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://dropimg.io" },
      },
    );
    expect(extend.status).toBe(200);
    const extended = (await extend.json()) as { expiresAt: number };
    expect(extended.expiresAt).toBe(before!.created_at + EXPIRY_30D);
    expect(extended.expiresAt).toBeGreaterThan(expiresBefore);

    const after = await env.DB.prepare(
      `SELECT r2_key, expires_at FROM images WHERE slug = ?`,
    )
      .bind(anon.slug)
      .first<{ r2_key: string; expires_at: number }>();
    expect(after?.r2_key.startsWith("o/pro/")).toBe(true);
    expect(await env.BUCKET.head(before!.r2_key)).toBeNull();
    expect(await env.BUCKET.head(after!.r2_key)).toBeTruthy();
  });

  it("rejects a Pro intent after the subscriber is downgraded", async () => {
    const { cookie, userId } = await signIn("stale-intent@example.com");
    await makePro(userId);
    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: EXPIRY_7D, password: "hunter2xx" }),
    });
    expect(intent.status).toBe(200);
    const created = (await intent.json()) as { uploadUrl: string };

    const env = await worker.getEnv();
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'canceled', current_period_end = 1 WHERE user_id = ?`,
    )
      .bind(userId)
      .run();

    const up = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.72",
      },
      body: PNG_1x1,
    });
    expect(up.status).toBe(400);
    const body = (await up.json()) as { error?: string };
    expect(body.error).toMatch(/no longer available/i);

    const reuse = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.72",
      },
      body: PNG_1x1,
    });
    expect(reuse.status).toBe(400);
  });
});
