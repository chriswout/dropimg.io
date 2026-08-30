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

const workerConfig = {
  configPath: "./wrangler.integration.jsonc",
  secrets: {
    IP_HASH_SECRET: "integration-test-ip-hash-secret",
    ADMIN_TOKEN: "integration-test-admin",
  },
  vars: {
    ENVIRONMENT: "development",
    LONG_TTL_ENABLED: "false",
    PRO_50MB_ENABLED: "false",
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
      "CF-Connecting-IP": "198.51.100.90",
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

describe("Password-protected images", () => {
  it("blocks bytes until unlock; owner session bypasses", async () => {
    const { cookie, userId } = await signIn("pro-lock@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'paddle', 'active', ?, 0, ?, ?)`,
    )
      .bind("sub-lock", userId, now + 86400, now, now)
      .run();

    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 86400, password: "s3cret99" }),
    });
    expect(intent.status).toBe(200);
    const created = (await intent.json()) as { uploadUrl: string };

    const up = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.70",
      },
      body: PNG_1x1,
    });
    expect(up.status).toBe(201);
    const uploaded = (await up.json()) as UploadResponse;

    const stored = await env.DB.prepare(
      `SELECT password_kdf, password_cost, password_block_size, password_parallelization, password_iterations
       FROM images WHERE slug = ?`,
    )
      .bind(uploaded.slug)
      .first<{
        password_kdf: string | null;
        password_cost: number | null;
        password_block_size: number | null;
        password_parallelization: number | null;
        password_iterations: number | null;
      }>();
    expect(stored?.password_kdf).toBe("scrypt-v1");
    expect(stored?.password_cost).toBe(16384);
    expect(stored?.password_block_size).toBe(8);
    expect(stored?.password_parallelization).toBe(5);
    expect(stored?.password_iterations).toBeNull();

    const blocked = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`);
    expect(blocked.status).toBe(401);

    const share = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    const html = await share.text();
    expect(html).toContain("Protected image");
    expect(html).toContain("brand-logo");
    expect(html).toContain("/brand/logo-dark-32.png");
    expect(html).toContain("/og.png");
    expect(html).not.toContain(`src="/i/${uploaded.slug}"`);
    expect(html).not.toContain(`/i/${uploaded.slug}"`);

    const ownerBytes = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`, {
      headers: { Cookie: cookie },
    });
    expect(ownerBytes.status).toBe(200);

    const wrong = await worker.fetch(`https://dropimg.io/api/i/${uploaded.slug}/unlock`, {
      method: "POST",
      headers: {
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password: "nope-nope" }),
    });
    expect(wrong.status).toBe(401);

    const unlock = await worker.fetch(`https://dropimg.io/api/i/${uploaded.slug}/unlock`, {
      method: "POST",
      headers: {
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password: "s3cret99" }),
    });
    expect(unlock.status).toBe(200);
    const unlockCookie = unlock.headers.get("Set-Cookie") || "";
    expect(unlockCookie).toMatch(/dropimg_img_/);

    const opened = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`, {
      headers: { Cookie: unlockCookie.split(";")[0]! },
    });
    expect(opened.status).toBe(200);
  });

  it("sets a password later from My drops", async () => {
    const { cookie, userId } = await signIn("pro-setpw@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'paddle', 'active', ?, 0, ?, ?)`,
    )
      .bind("sub-setpw", userId, now + 86400, now, now)
      .run();

    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 86400 }),
    });
    const created = (await intent.json()) as { uploadUrl: string };
    const up = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.74",
      },
      body: PNG_1x1,
    });
    const uploaded = (await up.json()) as UploadResponse;
    expect(await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`)).toHaveProperty(
      "status",
      200,
    );

    const set = await worker.fetch(
      `https://dropimg.io/api/account/images/${uploaded.slug}/password`,
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "https://dropimg.io",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "s3cret99" }),
      },
    );
    expect(set.status).toBe(200);
    expect(await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`)).toHaveProperty(
      "status",
      401,
    );
  });

  it("rejects password on Free accounts", async () => {
    const { cookie } = await signIn("free-lock@example.com");
    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 86400, password: "s3cret99" }),
    });
    expect(intent.status).toBe(400);
  });

  it("rejects 7-day expiry while LONG_TTL is off", async () => {
    const { cookie, userId } = await signIn("pro-ttl@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'paddle', 'active', ?, 0, ?, ?)`,
    )
      .bind("sub-ttl", userId, now + 86400, now, now)
      .run();

    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 7 * 24 * 60 * 60 }),
    });
    expect(intent.status).toBe(400);

    const extend = await worker.fetch(
      "https://dropimg.io/api/account/images/abcd1234/extend",
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://dropimg.io" },
      },
    );
    expect(extend.status).toBe(400);
  });

  it("keeps an existing password after the Pro period ends", async () => {
    const { cookie, userId } = await signIn("pro-downgrade@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'paddle', 'active', ?, 0, ?, ?)`,
    )
      .bind("sub-down", userId, now + 86400, now, now)
      .run();

    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 86400, password: "s3cret99" }),
    });
    const created = (await intent.json()) as { uploadUrl: string };
    const up = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.73",
      },
      body: PNG_1x1,
    });
    const uploaded = (await up.json()) as UploadResponse;

    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'canceled', current_period_end = ? WHERE id = ?`,
    )
      .bind(now - 1, "sub-down")
      .run();

    const blocked = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`);
    expect(blocked.status).toBe(401);
    const unlock = await worker.fetch(`https://dropimg.io/api/i/${uploaded.slug}/unlock`, {
      method: "POST",
      headers: {
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password: "s3cret99" }),
    });
    expect(unlock.status).toBe(200);
  });

  it("leaves anonymous POST /api/upload unowned on o/24h", async () => {
    const res = await worker.fetch("https://dropimg.io/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.80",
      },
      body: PNG_1x1,
    });
    expect(res.status).toBe(201);
    const uploaded = (await res.json()) as UploadResponse;
    const env = await worker.getEnv();
    const row = await env.DB.prepare(
      `SELECT user_id, r2_key FROM images WHERE slug = ?`,
    )
      .bind(uploaded.slug)
      .first<{ user_id: string | null; r2_key: string }>();
    expect(row?.user_id).toBeNull();
    expect(row?.r2_key.startsWith("o/24h/")).toBe(true);
  });

  it("does not treat leftover pbkdf2-sha256 intent hashes as scrypt", async () => {
    const { cookie, userId } = await signIn("pro-legacykdf@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'paddle', 'active', ?, 0, ?, ?)`,
    )
      .bind("sub-legacykdf", userId, now + 86400, now, now)
      .run();

    const leftover = await env.DB.prepare(
      `INSERT INTO upload_intents
        (id, user_id, expiry_seconds, max_bytes, created_at, expires_at,
         password_hash, password_salt, password_kdf, password_iterations)
       VALUES (?, ?, 86400, 10485760, ?, ?, ?, ?, 'pbkdf2-sha256', 600000)`,
    )
      .bind(
        "intent-legacy-pbkdf2",
        userId,
        now,
        now + 600,
        new Uint8Array(32),
        new Uint8Array(16),
      )
      .run();
    expect(leftover.success).toBe(true);

    const up = await worker.fetch(
      "https://dropimg.io/api/account/upload/intent-legacy-pbkdf2",
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/octet-stream",
          "CF-Connecting-IP": "203.0.113.81",
        },
        body: PNG_1x1,
      },
    );
    expect(up.status).toBe(400);
  });
});
