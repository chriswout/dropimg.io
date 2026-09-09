import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

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
      "CF-Connecting-IP": "198.51.100.80",
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

async function createApiKey(
  cookie: string,
  scopes?: string[],
): Promise<{ id: string; token: string; scopes: string[] }> {
  const res = await worker.fetch("https://dropimg.io/api/account/integrations", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://dropimg.io",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      label: "API key",
      kind: "api",
      ...(scopes ? { scopes } : {}),
    }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { id: string; token: string; scopes: string[] };
  expect(body.token.startsWith("dropimg_api_")).toBe(true);
  return body;
}

function multipart(file: Uint8Array, expiry = "7d"): { body: Uint8Array; contentType: string } {
  const boundary = "----dropimgapiv1";
  const extras = `--${boundary}\r\nContent-Disposition: form-data; name="expiry"\r\n\r\n${expiry}\r\n`;
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

describe("/api/v1/images", () => {
  it("creates a key with all scopes by default, then upload/get/list/delete", async () => {
    const { cookie } = await signIn("api-full@example.com");
    const key = await createApiKey(cookie);
    expect(key.scopes).toEqual(["images:write", "images:read", "images:delete"]);

    const { body, contentType } = multipart(PNG_1x1, "7d");
    const created = await worker.fetch("https://dropimg.io/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.token}`,
        "Content-Type": contentType,
        "CF-Connecting-IP": "198.51.100.81",
      },
      body,
    });
    expect(created.status).toBe(201);
    const image = (await created.json()) as Record<string, unknown>;
    expect(image).toMatchObject({
      url: expect.stringMatching(/^https:\/\/dropimg\.io\/[A-Za-z0-9]+$/),
      image_url: expect.stringMatching(/^https:\/\/dropimg\.io\/i\/[A-Za-z0-9]+$/),
    });
    expect(image).toHaveProperty("created_at");
    expect(image).toHaveProperty("expires_at");
    expect(image).not.toHaveProperty("delete_url");
    expect(image).not.toHaveProperty("deleteUrl");
    expect(image).not.toHaveProperty("delete_token");
    const id = String(image.id);

    const got = await worker.fetch(`https://dropimg.io/api/v1/images/${id}`, {
      headers: { Authorization: `Bearer ${key.token}` },
    });
    expect(got.status).toBe(200);
    const one = (await got.json()) as { id: string; created_at: string; expires_at: string };
    expect(one.id).toBe(id);
    expect(one.created_at).toMatch(/Z$/);
    expect(one.expires_at).toMatch(/Z$/);

    const listed = await worker.fetch("https://dropimg.io/api/v1/images", {
      headers: { Authorization: `Bearer ${key.token}` },
    });
    expect(listed.status).toBe(200);
    const envelope = (await listed.json()) as { data: Array<{ id: string }>; next_cursor: string | null };
    expect(Array.isArray(envelope.data)).toBe(true);
    expect(envelope.data.some((row) => row.id === id)).toBe(true);
    expect(envelope).toHaveProperty("next_cursor");

    const deleted = await worker.fetch(`https://dropimg.io/api/v1/images/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key.token}` },
    });
    expect(deleted.status).toBe(200);

    const missing = await worker.fetch(`https://dropimg.io/api/v1/images/${id}`, {
      headers: { Authorization: `Bearer ${key.token}` },
    });
    expect(missing.status).toBe(404);
  });

  it("rejects anonymous, wrong scope, and revoked keys", async () => {
    const { cookie } = await signIn("api-scope@example.com");
    const readOnly = await createApiKey(cookie, ["images:read"]);
    const { body, contentType } = multipart(PNG_1x1);

    expect(
      (
        await worker.fetch("https://dropimg.io/api/v1/images", {
          method: "POST",
          headers: { "Content-Type": contentType },
          body,
        })
      ).status,
    ).toBe(401);

    const forbidden = await worker.fetch("https://dropimg.io/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readOnly.token}`,
        "Content-Type": contentType,
      },
      body,
    });
    expect(forbidden.status).toBe(403);

    const full = await createApiKey(cookie);

    await worker.fetch(`https://dropimg.io/api/account/integrations/${full.id}/revoke`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
    });

    expect(
      (
        await worker.fetch("https://dropimg.io/api/v1/images", {
          headers: { Authorization: `Bearer ${full.token}` },
        })
      ).status,
    ).toBe(401);
  });

  it("defaults Free API expiry to 24h", async () => {
    const { cookie } = await signIn("api-default-expiry@example.com");
    const key = await createApiKey(cookie);
    const { body, contentType } = multipart(PNG_1x1, "");
    const created = await worker.fetch("https://dropimg.io/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.token}`,
        "Content-Type": contentType,
        "CF-Connecting-IP": "198.51.100.82",
      },
      body,
    });
    expect(created.status).toBe(201);
    const image = (await created.json()) as { created_at: string; expires_at: string };
    const createdAt = Date.parse(image.created_at);
    const expiresAt = Date.parse(image.expires_at);
    expect(expiresAt - createdAt).toBe(24 * 60 * 60 * 1000);
  });

  it("caps Free API uploads at 20 per day", async () => {
    const { cookie } = await signIn("api-quota@example.com");
    const key = await createApiKey(cookie);
    const { body, contentType } = multipart(PNG_1x1, "24h");
    for (let i = 0; i < 20; i++) {
      const res = await worker.fetch("https://dropimg.io/api/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.token}`,
          "Content-Type": contentType,
          "CF-Connecting-IP": `198.51.100.${10 + i}`,
        },
        body,
      });
      expect(res.status, `upload ${i + 1}`).toBe(201);
    }
    const blocked = await worker.fetch("https://dropimg.io/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.token}`,
        "Content-Type": contentType,
        "CF-Connecting-IP": "198.51.100.40",
      },
      body,
    });
    expect(blocked.status).toBe(429);
    const err = (await blocked.json()) as { code?: string; error?: string };
    expect(err.code).toBe("quota_exceeded");
    expect(err.error).toContain("20/day");
  });
});
