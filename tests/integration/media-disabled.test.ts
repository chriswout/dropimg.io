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

describe("media flag off", () => {
  it("404s media API and alias delivery", async () => {
    const api = await worker.fetch("https://dropimg.io/api/v1/media/orgs", {
      method: "POST",
      headers: {
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(api.status).toBe(404);
    const body = (await api.json()) as { code: string };
    expect(body.code).toBe("not_found");

    const alias = await worker.fetch("https://dropimg.io/m/acme/site/header");
    expect(alias.status).toBe(404);

    const page = await worker.fetch("https://dropimg.io/app/media");
    expect(page.status).toBe(404);
  });

  it("still accepts temporary drops", async () => {
    const res = await worker.fetch("https://dropimg.io/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.11",
      },
      body: PNG_1x1,
    });
    expect(res.status).toBe(201);
  });
});
