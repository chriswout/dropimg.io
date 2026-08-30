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

const EXPIRY_1H = 60 * 60;
const EXPIRY_24H = 24 * 60 * 60;
const EXPIRY_7D = 7 * 24 * 60 * 60;
const EXPIRY_30D = 30 * 24 * 60 * 60;
const EXPIRY_90D = 90 * 24 * 60 * 60;

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

async function anonUpload(
  ip: string,
  expirySeconds?: number,
): Promise<UploadResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "CF-Connecting-IP": ip,
  };
  if (expirySeconds != null) headers["X-Dropimg-Expiry"] = String(expirySeconds);
  const res = await worker.fetch("https://dropimg.io/api/upload", {
    method: "POST",
    headers,
    body: PNG_1x1,
  });
  expect(res.status).toBe(201);
  return (await res.json()) as UploadResponse;
}

async function imageRow(slug: string) {
  const env = await worker.getEnv();
  const row = await env.DB.prepare(
    `SELECT r2_key, created_at, expires_at FROM images WHERE slug = ?`,
  )
    .bind(slug)
    .first<{ r2_key: string; created_at: number; expires_at: number }>();
  expect(row).toBeTruthy();
  return row!;
}

async function claim(cookie: string, drop: UploadResponse): Promise<void> {
  await worker.fetch("https://dropimg.io/api/account/claim", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://dropimg.io",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ slug: drop.slug, deleteToken: drop.deleteToken }],
    }),
  });
}

function extendTo(cookie: string, slug: string, expiry?: number) {
  return worker.fetch(
    `https://dropimg.io/api/account/images/${slug}/extend`,
    {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: expiry == null ? undefined : JSON.stringify({ expiry }),
    },
  );
}

describe("anonymous expiry header", () => {
  it("defaults to 7 days and stores each lifetime under its R2 class", async () => {
    const fallback = await anonUpload("203.0.113.10");
    const defaulted = await imageRow(fallback.slug);
    expect(defaulted.expires_at - defaulted.created_at).toBe(EXPIRY_7D);
    expect(defaulted.r2_key.startsWith("o/7d/")).toBe(true);

    const hour = await imageRow((await anonUpload("203.0.113.11", EXPIRY_1H)).slug);
    expect(hour.expires_at - hour.created_at).toBe(EXPIRY_1H);
    expect(hour.r2_key.startsWith("o/24h/")).toBe(true);

    const day = await imageRow((await anonUpload("203.0.113.12", EXPIRY_24H)).slug);
    expect(day.expires_at - day.created_at).toBe(EXPIRY_24H);
    expect(day.r2_key.startsWith("o/24h/")).toBe(true);

    const week = await imageRow((await anonUpload("203.0.113.13", EXPIRY_7D)).slug);
    expect(week.r2_key.startsWith("o/7d/")).toBe(true);
  });

  it("rejects lifetimes the anonymous plan cannot reach", async () => {
    for (const [ip, expiry] of [
      ["203.0.113.14", EXPIRY_30D],
      ["203.0.113.15", EXPIRY_90D],
      ["203.0.113.16", 7200],
    ] as const) {
      const res = await worker.fetch("https://dropimg.io/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "CF-Connecting-IP": ip,
          "X-Dropimg-Expiry": String(expiry),
        },
        body: PNG_1x1,
      });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("invalid_expiry");
    }
  });
});

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

    const anon = await anonUpload("203.0.113.72", EXPIRY_24H);
    await claim(cookie, anon);

    const before = await imageRow(anon.slug);
    expect(before.r2_key.startsWith("o/24h/")).toBe(true);

    const extend = await extendTo(cookie, anon.slug, EXPIRY_30D);
    expect(extend.status).toBe(200);
    const extended = (await extend.json()) as { expiresAt: number };
    expect(extended.expiresAt).toBe(before.created_at + EXPIRY_30D);
    expect(extended.expiresAt).toBeGreaterThan(before.expires_at);

    const after = await imageRow(anon.slug);
    expect(after.r2_key.startsWith("o/pro/")).toBe(true);
    expect(await env.BUCKET.head(before.r2_key)).toBeNull();
    expect(await env.BUCKET.head(after.r2_key)).toBeTruthy();
  });

  it("moves a claimed 7-day object off o/7d and stops at the 90-day ceiling", async () => {
    const { cookie, userId } = await signIn("pro-cap@example.com");
    await makePro(userId);

    const anon = await anonUpload("203.0.113.73");
    await claim(cookie, anon);
    const before = await imageRow(anon.slug);
    expect(before.r2_key.startsWith("o/7d/")).toBe(true);

    const toNinety = await extendTo(cookie, anon.slug, EXPIRY_90D);
    expect(toNinety.status).toBe(200);
    expect(((await toNinety.json()) as { expiresAt: number }).expiresAt).toBe(
      before.created_at + EXPIRY_90D,
    );

    const after = await imageRow(anon.slug);
    expect(after.r2_key.startsWith("o/pro/")).toBe(true);
    expect(after.expires_at - after.created_at).toBe(EXPIRY_90D);

    // Nothing left to give: the ceiling is measured from the original upload.
    const again = await extendTo(cookie, anon.slug, EXPIRY_90D);
    expect(again.status).toBe(400);
    expect(await imageRow(anon.slug)).toMatchObject({
      expires_at: after.expires_at,
    });
  });

  it("refuses an extend that would shorten the link", async () => {
    const { cookie, userId } = await signIn("pro-shorten@example.com");
    await makePro(userId);

    const anon = await anonUpload("203.0.113.74");
    await claim(cookie, anon);
    const before = await imageRow(anon.slug);

    const shorter = await extendTo(cookie, anon.slug, EXPIRY_1H);
    expect(shorter.status).toBe(400);
    expect(await imageRow(anon.slug)).toMatchObject({
      expires_at: before.expires_at,
      r2_key: before.r2_key,
    });
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
