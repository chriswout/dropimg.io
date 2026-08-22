import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import type { UploadResponse } from "../../src/types";

/** Minimal valid 1×1 PNG (complete IHDR/IDAT/IEND) */
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

async function uploadPng(): Promise<UploadResponse> {
  const res = await worker.fetch("https://dropimg.io/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "CF-Connecting-IP": "203.0.113.10",
    },
    body: PNG_1x1,
  });
  expect(res.status).toBe(201);
  return (await res.json()) as UploadResponse;
}

describe("Worker integration", () => {
  it("upload → D1/R2 → share → image → delete → 410", async () => {
    const uploaded = await uploadPng();
    expect(uploaded.slug).toHaveLength(8);
    expect(uploaded.deleteToken).toBeTruthy();

    const share = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    expect(share.status).toBe(200);
    expect(share.headers.get("X-Robots-Tag")).toMatch(/noindex/i);
    const html = await share.text();
    expect(html).toContain(`/i/${uploaded.slug}`);

    const image = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`);
    expect(image.status).toBe(200);
    expect(image.headers.get("Content-Type")).toBe("image/png");
    expect(image.headers.get("X-Robots-Tag")).toMatch(/noindex/i);
    expect(image.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const bytes = new Uint8Array(await image.arrayBuffer());
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);

    const etag = image.headers.get("ETag");
    expect(etag).toBeTruthy();
    const notModified = await worker.fetch(
      `https://dropimg.io/i/${uploaded.slug}`,
      { headers: { "If-None-Match": etag! } },
    );
    expect(notModified.status).toBe(304);
    expect(notModified.headers.get("ETag")).toBe(etag);
    expect(notModified.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(notModified.headers.get("Cache-Control")).toMatch(/max-age=300/);
    expect(notModified.headers.get("X-Robots-Tag")).toMatch(/noindex/i);

    const del = await worker.fetch(`https://dropimg.io/api/i/${uploaded.slug}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${uploaded.deleteToken}` },
    });
    expect(del.status).toBe(200);

    const shareGone = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    expect(shareGone.status).toBe(410);

    const imageGone = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`);
    expect(imageGone.status).toBe(404);
  });

  it("cron expiry tombstones live images", async () => {
    const uploaded = await uploadPng();
    const env = await worker.getEnv<Cloudflare.Env>();

    await env.DB.prepare(`UPDATE images SET expires_at = ? WHERE slug = ?`)
      .bind(Math.floor(Date.now() / 1000) - 10, uploaded.slug)
      .run();

    const result = await worker.scheduled({
      cron: "*/5 * * * *",
      scheduledTime: new Date(),
    });
    expect(result.outcome).toBe("ok");

    const share = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    expect(share.status).toBe(410);

    const image = await worker.fetch(`https://dropimg.io/i/${uploaded.slug}`);
    expect(image.status).toBe(404);
  });

  it("redirects www to apex", async () => {
    const res = await worker.fetch("https://www.dropimg.io/abuse", {
      redirect: "manual",
    });
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://dropimg.io/abuse");
  });

  it("refuses uploads when production secret is missing", async () => {
    await server.update({
      workers: [
        {
          ...workerConfig,
          secrets: {
            IP_HASH_SECRET: "",
            ADMIN_TOKEN: "integration-test-admin",
          },
          vars: {
            ENVIRONMENT: "production",
          },
        },
      ],
    });
    await worker.applyD1Migrations("DB");

    const res = await worker.fetch("https://dropimg.io/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.11",
      },
      body: PNG_1x1,
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("server_error");

    await server.update({ workers: [workerConfig] });
  });
});
