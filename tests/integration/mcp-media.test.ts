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
        MEDIA_ENABLED: "true",
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
      "CF-Connecting-IP": "198.51.100.91",
    },
    body: JSON.stringify({ email }),
  });
  const body = (await started.json()) as { devMagicUrl?: string };
  const cb = await worker.fetch(body.devMagicUrl!, { redirect: "manual" });
  return cookieFrom(cb);
}

function jsonHeaders(cookie: string): HeadersInit {
  return {
    Cookie: cookie,
    Origin: "https://dropimg.io",
    "Content-Type": "application/json",
  };
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
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
}

function toolText(raw: string): string {
  const match = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(raw);
  if (!match) return raw;
  return JSON.parse(`"${match[1]}"`) as string;
}

async function bootstrap(cookie: string, slug = "website") {
  const orgRes = await worker.fetch("https://dropimg.io/api/v1/media/orgs", {
    method: "POST",
    headers: jsonHeaders(cookie),
    body: "{}",
  });
  const org = (await orgRes.json()) as { org: { id: string } };
  const projectRes = await worker.fetch(
    `https://dropimg.io/api/v1/media/orgs/${org.org.id}/projects`,
    {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ slug, name: slug }),
    },
  );
  const project = (await projectRes.json()) as { project: { id: string } };
  const keyRes = await worker.fetch(
    `https://dropimg.io/api/v1/media/projects/${project.project.id}/keys`,
    {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ label: "MCP" }),
    },
  );
  const key = (await keyRes.json()) as { id: string; token: string };
  return { projectId: project.project.id, token: key.token, keyId: key.id };
}

describe("Media MCP", () => {
  it("lists and creates projects, then uploads via intent", async () => {
    const cookie = await signIn("mcp-media@example.com");
    const ctx = await bootstrap(cookie);
    const listed = await mcpCall(ctx.token, "tools/call", {
      name: "list_media_projects",
      arguments: {},
    });
    const listedText = toolText(await listed.text());
    expect(listedText).toMatch(/project_id/);
    expect(listedText).toContain(ctx.projectId);

    const created = await mcpCall(
      ctx.token,
      "tools/call",
      { name: "create_media_project", arguments: { slug: "landing" } },
      2,
    );
    expect(await created.text()).toMatch(/A project key cannot create projects/);

    const upload = await mcpCall(
      ctx.token,
      "tools/call",
      { name: "upload_media_asset", arguments: { project_id: ctx.projectId, path: "logo" } },
      3,
    );
    const uploadText = toolText(await upload.text());
    expect(uploadText).not.toMatch(/base64/);
    const payload = JSON.parse(uploadText) as {
      upload_url: string;
      headers: { Authorization: string };
      intent_id: string;
    };
    const uploaded = await worker.fetch(payload.upload_url, {
      method: "POST",
      headers: {
        Authorization: payload.headers.Authorization,
        "Content-Type": "application/octet-stream",
      },
      body: PNG_1x1,
    });
    expect(uploaded.status).toBe(201);
    const asset = (await uploaded.json()) as { asset: { id: string; url: string } };
    expect(asset.asset.url).toMatch(/\/m\//);

    const got = await mcpCall(
      ctx.token,
      "tools/call",
      { name: "get_media_asset", arguments: { project_id: ctx.projectId, asset_id: asset.asset.id } },
      4,
    );
    expect(toolText(await got.text())).toContain(asset.asset.id);

    const listedAssets = await mcpCall(
      ctx.token,
      "tools/call",
      { name: "list_media_assets", arguments: { project_id: ctx.projectId } },
      5,
    );
    expect(toolText(await listedAssets.text())).toContain("logo");

    const unconfirmed = await mcpCall(
      ctx.token,
      "tools/call",
      { name: "replace_media_asset", arguments: { project_id: ctx.projectId, asset_id: asset.asset.id } },
      6,
    );
    expect(toolText(await unconfirmed.text())).toMatch(/confirm: true/);

    const replace = await mcpCall(
      ctx.token,
      "tools/call",
      {
        name: "replace_media_asset",
        arguments: { project_id: ctx.projectId, asset_id: asset.asset.id, confirm: true },
      },
      7,
    );
    expect(toolText(await replace.text())).toMatch(/upload_url/);
  });

  it("blocks cross-project access and revoked keys", async () => {
    const cookie = await signIn("mcp-iso@example.com");
    const a = await bootstrap(cookie, "alpha");
    const b = await bootstrap(cookie, "beta");
    const peek = await mcpCall(a.token, "tools/call", {
      name: "list_media_assets",
      arguments: { project_id: b.projectId },
    });
    expect(toolText(await peek.text())).toMatch(/Not found/i);

    const revoke = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${a.projectId}/keys/${a.keyId}/revoke`,
      { method: "POST", headers: jsonHeaders(cookie), body: "{}" },
    );
    expect(revoke.status).toBe(200);
    const listed = await mcpCall(a.token, "tools/call", {
      name: "list_media_projects",
      arguments: {},
    });
    expect(listed.status).toBe(401);
  });

  it("rejects invalid keys", async () => {
    const res = await mcpCall("dropimg_pk_thisisnotarealtokenvalue12", "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    });
    expect(res.status).toBe(401);
  });
});
