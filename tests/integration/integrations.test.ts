import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import type { UploadResponse } from "../../src/types";
import { hashIntegrationToken } from "../../src/lib/integration-token";

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

async function grantPro(userId: string) {
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

async function createToken(cookie: string, label = "Chrome extension", kind = "extension") {
  const res = await worker.fetch("https://dropimg.io/api/account/integrations", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://dropimg.io",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label, kind }),
  });
  expect(res.status).toBe(200);
  return res.json() as Promise<{
    id: string;
    label: string;
    token: string;
    createdAt: number;
    sharexConfig: { Headers?: { Authorization?: string } };
  }>;
}

function multipart(file: Uint8Array, expiry?: string): { body: Uint8Array; contentType: string } {
  const boundary = "----dropimgtest";
  const extras = expiry
    ? `--${boundary}\r\nContent-Disposition: form-data; name="expiry"\r\n\r\n${expiry}\r\n`
    : "";
  const prefix = new TextEncoder().encode(
    extras +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="x.png"\r\n` +
      `Content-Type: image/png\r\n` +
      `\r\n`,
  );
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const payload = new Uint8Array(prefix.length + file.length + suffix.length);
  payload.set(prefix, 0);
  payload.set(file, prefix.length);
  payload.set(suffix, prefix.length + file.length);
  return { body: payload, contentType: `multipart/form-data; boundary=${boundary}` };
}

describe("Integration tokens", () => {
  it("creates a token once, stores only the hash, and lists metadata", async () => {
    const { cookie, userId } = await signIn("tok-create@example.com");
    const created = await createToken(cookie);
    expect(created.token.startsWith("dropimg_it_")).toBe(true);
    expect(created.sharexConfig.Headers?.Authorization).toBe(`Bearer ${created.token}`);

    const env = await worker.getEnv();
    const row = await env.DB.prepare(
      `SELECT token_hash, label, scope, revoked_at FROM integration_tokens WHERE id = ?`,
    )
      .bind(created.id)
      .first<{ token_hash: ArrayBuffer; label: string; scope: string; revoked_at: number | null }>();
    expect(row?.label).toBe("Chrome extension");
    expect(row?.scope).toBe("upload");
    expect(row?.revoked_at).toBeNull();
    const stored = Buffer.from(new Uint8Array(row!.token_hash)).toString("hex");
    const expected = Buffer.from(new Uint8Array(await hashIntegrationToken(created.token))).toString(
      "hex",
    );
    expect(stored).toBe(expected);
    expect(JSON.stringify(row)).not.toContain(created.token);

    const list = await worker.fetch("https://dropimg.io/api/account/integrations", {
      headers: { Cookie: cookie },
    });
    const listed = (await list.json()) as { tokens: Array<Record<string, unknown>> };
    expect(listed.tokens).toHaveLength(1);
    expect(listed.tokens[0]).toMatchObject({
      id: created.id,
      label: "Chrome extension",
      scope: "upload",
    });
    expect(JSON.stringify(listed)).not.toContain(created.token);
    expect(listed.tokens[0]).not.toHaveProperty("token");

    const me = await worker.fetch("https://dropimg.io/api/integrations/me", {
      headers: { Authorization: `Bearer ${created.token}` },
    });
    expect(me.status).toBe(200);
    const body = (await me.json()) as { connected: boolean; user: { emailMasked: string } };
    expect(body.connected).toBe(true);
    expect(body.user.emailMasked).toMatch(/^t\*\*\*@example\.com$/);

    await new Promise((r) => setTimeout(r, 25));
    const used = await env.DB.prepare(
      `SELECT last_used_at FROM integration_tokens WHERE id = ?`,
    )
      .bind(created.id)
      .first<{ last_used_at: number | null }>();
    expect(used?.last_used_at).toBeTruthy();
    expect(userId).toBeTruthy();
  });

  it("rejects invalid, revoked, and other users' tokens", async () => {
    const a = await signIn("tok-a@example.com");
    const b = await signIn("tok-b@example.com");
    const created = await createToken(a.cookie, "ShareX", "sharex");

    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/me", {
          headers: { Authorization: "Bearer dropimg_it_notrealnotrealnotreal12" },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await worker.fetch(`https://dropimg.io/api/integrations/me?token=${created.token}`)
      ).status,
    ).toBe(401);

    const steal = await worker.fetch(
      `https://dropimg.io/api/account/integrations/${created.id}/revoke`,
      {
        method: "POST",
        headers: { Cookie: b.cookie, Origin: "https://dropimg.io" },
      },
    );
    expect(steal.status).toBe(404);

    const revoke = await worker.fetch(
      `https://dropimg.io/api/account/integrations/${created.id}/revoke`,
      {
        method: "POST",
        headers: { Cookie: a.cookie, Origin: "https://dropimg.io" },
      },
    );
    expect(revoke.status).toBe(200);
    expect(
      (
        await worker.fetch(
          `https://dropimg.io/api/account/integrations/${created.id}/revoke`,
          {
            method: "POST",
            headers: { Cookie: a.cookie, Origin: "https://dropimg.io" },
          },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/me", {
          headers: { Authorization: `Bearer ${created.token}` },
        })
      ).status,
    ).toBe(401);
  });

  it("does not let a Bearer token use session-only account or admin routes", async () => {
    const { cookie } = await signIn("tok-scope@example.com");
    const created = await createToken(cookie);
    const headers = { Authorization: `Bearer ${created.token}` };
    const me = await worker.fetch("https://dropimg.io/api/account/me", { headers });
    const meBody = (await me.json()) as { user: unknown };
    expect(meBody.user).toBeNull();
    expect(
      (
        await worker.fetch("https://dropimg.io/api/account/delete", {
          method: "POST",
          headers: { ...headers, Origin: "https://dropimg.io" },
        })
      ).status,
    ).toBe(401);
    const admin = await worker.fetch("https://dropimg.io/admin/reports", {
      headers,
      redirect: "manual",
    });
    expect([302, 401, 403]).toContain(admin.status);
  });

  it("uploads with a token, attributes the client, and appears in My drops", async () => {
    const { cookie, userId } = await signIn("tok-up@example.com");
    const created = await createToken(cookie);
    const intent = await worker.fetch("https://dropimg.io/api/integrations/upload-intent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${created.token}`,
        "Content-Type": "application/json",
        "X-Dropimg-Client": "chrome-extension",
      },
      body: JSON.stringify({ expiry: 86400 }),
    });
    expect(intent.status).toBe(200);
    const createdIntent = (await intent.json()) as { uploadUrl: string };
    const up = await worker.fetch(`https://dropimg.io${createdIntent.uploadUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${created.token}`,
        "Content-Type": "application/octet-stream",
        "X-Dropimg-Client": "chrome-extension",
        "CF-Connecting-IP": "203.0.113.40",
      },
      body: PNG_1x1,
    });
    expect(up.status).toBe(201);
    const uploaded = (await up.json()) as UploadResponse;
    const env = await worker.getEnv();
    const row = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(uploaded.slug)
      .first<{ user_id: string }>();
    expect(row?.user_id).toBe(userId);

    const app = await worker.fetch("https://dropimg.io/app", { headers: { Cookie: cookie } });
    expect(await app.text()).toContain(uploaded.slug);
  });

  it("blocks a revoked token after intent creation and leftover Pro intents after downgrade", async () => {
    const { cookie, userId } = await signIn("tok-revoke-intent@example.com");
    await grantPro(userId);
    const created = await createToken(cookie);
    const intent = await worker.fetch("https://dropimg.io/api/integrations/upload-intent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${created.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 7 * 24 * 60 * 60 }),
    });
    expect(intent.status).toBe(200);
    const createdIntent = (await intent.json()) as { id: string; uploadUrl: string };

    await worker.fetch(`https://dropimg.io/api/account/integrations/${created.id}/revoke`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://dropimg.io" },
    });
    expect(
      (
        await worker.fetch(`https://dropimg.io${createdIntent.uploadUrl}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${created.token}`,
            "Content-Type": "application/octet-stream",
            "CF-Connecting-IP": "203.0.113.41",
          },
          body: PNG_1x1,
        })
      ).status,
    ).toBe(401);

    const other = await createToken(cookie, "Work PC", "other");
    const late = await worker.fetch("https://dropimg.io/api/integrations/upload-intent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${other.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 7 * 24 * 60 * 60 }),
    });
    const lateIntent = (await late.json()) as { uploadUrl: string };
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'canceled', current_period_end = ? WHERE user_id = ?`,
    )
      .bind(now - 1, userId)
      .run();
    expect(
      (
        await worker.fetch(`https://dropimg.io${lateIntent.uploadUrl}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${other.token}`,
            "Content-Type": "application/octet-stream",
            "CF-Connecting-IP": "203.0.113.42",
          },
          body: PNG_1x1,
        })
      ).status,
    ).toBe(400);
  });

  it("enforces Free vs Pro expiry and password on integration intents", async () => {
    const free = await signIn("tok-free@example.com");
    const freeTok = await createToken(free.cookie);
    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/upload-intent", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${freeTok.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiry: 7 * 24 * 60 * 60 }),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/upload-intent", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${freeTok.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiry: 86400, password: "s3cret99" }),
        })
      ).status,
    ).toBe(400);

    const pro = await signIn("tok-pro@example.com");
    await grantPro(pro.userId);
    const proTok = await createToken(pro.cookie);
    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/upload-intent", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${proTok.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiry: 7 * 24 * 60 * 60 }),
        })
      ).status,
    ).toBe(200);
  });

  it("keeps anonymous ShareX working and owns authenticated ShareX uploads", async () => {
    const anon = multipart(PNG_1x1);
    const anonRes = await worker.fetch("https://dropimg.io/api/integrations/sharex", {
      method: "POST",
      headers: {
        "Content-Type": anon.contentType,
        "CF-Connecting-IP": "198.51.100.21",
      },
      body: anon.body,
    });
    expect(anonRes.status).toBe(201);
    const anonJson = (await anonRes.json()) as UploadResponse;
    const env = await worker.getEnv();
    const anonRow = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(anonJson.slug)
      .first<{ user_id: string | null }>();
    expect(anonRow?.user_id).toBeNull();

    const { cookie, userId } = await signIn("tok-sharex@example.com");
    const created = await createToken(cookie, "ShareX", "sharex");
    const authBody = multipart(PNG_1x1, "24h");
    const authRes = await worker.fetch("https://dropimg.io/api/integrations/sharex", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${created.token}`,
        "Content-Type": authBody.contentType,
        "CF-Connecting-IP": "198.51.100.22",
        "X-Dropimg-Client": "sharex",
      },
      body: authBody.body,
    });
    expect(authRes.status).toBe(201);
    const owned = (await authRes.json()) as UploadResponse;
    const ownedRow = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(owned.slug)
      .first<{ user_id: string }>();
    expect(ownedRow?.user_id).toBe(userId);
  });

  it("revokes every integration token when the account is deleted", async () => {
    const { cookie, userId } = await signIn("tok-delete@example.com");
    const first = await createToken(cookie);
    const second = await createToken(cookie, "ShareX", "sharex");
    const del = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: { Cookie: cookie, Origin: "https://dropimg.io" },
    });
    expect(del.status).toBe(200);
    const env = await worker.getEnv();
    const rows = await env.DB.prepare(
      `SELECT revoked_at FROM integration_tokens WHERE user_id = ?`,
    )
      .bind(userId)
      .all<{ revoked_at: number | null }>();
    expect(rows.results?.length).toBe(2);
    expect(rows.results?.every((r) => r.revoked_at)).toBe(true);
    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/me", {
          headers: { Authorization: `Bearer ${first.token}` },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await worker.fetch("https://dropimg.io/api/integrations/me", {
          headers: { Authorization: `Bearer ${second.token}` },
        })
      ).status,
    ).toBe(401);
  });
});
