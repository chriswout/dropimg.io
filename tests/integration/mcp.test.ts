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

async function signIn(email: string): Promise<string> {
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
  return cookieFrom(cb);
}

async function createApiKey(cookie: string): Promise<string> {
  const res = await worker.fetch("https://dropimg.io/api/account/integrations", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://dropimg.io",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label: "MCP", kind: "api" }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { token: string };
  return body.token;
}

function b64Png(): string {
  let binary = "";
  for (const b of PNG_1x1) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function mcpCall(
  token: string,
  method: string,
  params: Record<string, unknown>,
  id = 1,
): Promise<Response> {
  return worker.fetch("https://dropimg.io/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });
}

describe("MCP /mcp", () => {
  it("challenges unauthenticated clients and accepts an API key", async () => {
    const anon = await worker.fetch("https://dropimg.io/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    });
    expect(anon.status).toBe(401);
    expect(anon.headers.get("WWW-Authenticate") || "").toMatch(/Bearer/i);

    const cookie = await signIn("mcp-key@example.com");
    const token = await createApiKey(cookie);
    const init = await mcpCall(token, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    });
    expect(init.status).toBeLessThan(500);
    expect(init.status).not.toBe(401);

    const resource = await worker.fetch(
      "https://dropimg.io/.well-known/oauth-protected-resource/mcp",
    );
    expect(resource.status).toBe(200);
    const resourceBody = (await resource.json()) as { resource?: string };
    expect(resourceBody.resource || "").toContain("/mcp");

    const asMeta = await worker.fetch(
      "https://dropimg.io/.well-known/oauth-authorization-server",
    );
    expect(asMeta.status).toBe(200);
    const meta = (await asMeta.json()) as {
      authorization_endpoint?: string;
      token_endpoint?: string;
      registration_endpoint?: string;
    };
    expect(meta.authorization_endpoint || "").toContain("/oauth/authorize");
    expect(meta.token_endpoint || "").toContain("/oauth/token");
    expect(meta.registration_endpoint || "").toContain("/oauth/register");
  });

  it("uploads via the upload_image tool", async () => {
    const cookie = await signIn("mcp-upload@example.com");
    const token = await createApiKey(cookie);
    const res = await mcpCall(
      token,
      "tools/call",
      {
        name: "upload_image",
        arguments: { image: `data:image/png;base64,${b64Png()}`, expiry: "7d" },
      },
      2,
    );
    expect(res.status).toBeLessThan(500);
    const text = await res.text();
    expect(text).toMatch(/dropimg\.io|expires|Missing scope|result|error/i);
  });
});
