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
        MEDIA_ENABLED: "false",
        MEDIA_CONTROL_PLANE_ENABLED: "false",
        MEDIA_DELIVERY_ENABLED: "true",
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

describe("delivery-only rollback", () => {
  it("keeps public aliases online while ingest is off", async () => {
    const env = await worker.getEnv<Cloudflare.Env>();
    const now = Math.floor(Date.now() / 1000);
    const orgId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const assetId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const aliasId = crypto.randomUUID();
    const r2Key = `p/${orgId}/${projectId}/${assetId}/${versionId}/original`;
    await env.BUCKET.put(r2Key, PNG_1x1, { httpMetadata: { contentType: "image/png" } });
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO organizations (id, slug, name, lifecycle_status, created_at)
         VALUES (?, 'acme', 'Acme', 'active', ?)`,
      ).bind(orgId, now),
      env.DB.prepare(
        `INSERT INTO projects (id, org_id, slug, name, created_at) VALUES (?, ?, 'site', 'Site', ?)`,
      ).bind(projectId, orgId, now),
      env.DB.prepare(
        `INSERT INTO assets (id, org_id, project_id, name, created_at) VALUES (?, ?, ?, 'hero', ?)`,
      ).bind(assetId, orgId, projectId, now),
      env.DB.prepare(
        `INSERT INTO asset_versions
          (id, org_id, asset_id, r2_key, sha256, mime, byte_size, status, created_at)
         VALUES (?, ?, ?, ?, 'abc', 'image/png', 70, 'ready', ?)`,
      ).bind(versionId, orgId, assetId, r2Key, now),
      env.DB.prepare(
        `INSERT INTO asset_aliases
          (id, org_id, project_id, asset_id, path, current_version_id, created_at)
         VALUES (?, ?, ?, ?, 'hero', ?, ?)`,
      ).bind(aliasId, orgId, projectId, assetId, versionId, now),
    ]);

    const api = await worker.fetch("https://dropimg.io/api/v1/media/orgs", {
      method: "POST",
      headers: { Origin: "https://dropimg.io", "Content-Type": "application/json" },
      body: "{}",
    });
    expect(api.status).toBe(404);

    const delivered = await worker.fetch("https://dropimg.io/m/acme/site/hero");
    expect(delivered.status).toBe(200);
    expect(delivered.headers.get("content-type")).toMatch(/image\/png/);
  });
});
