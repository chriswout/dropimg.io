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

const ADMIN = "integration-test-admin";

const workerConfig = {
  configPath: "./wrangler.integration.jsonc",
  secrets: {
    IP_HASH_SECRET: "integration-test-ip-hash-secret",
    ADMIN_TOKEN: ADMIN,
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
      "CF-Connecting-IP": "198.51.100.20",
    },
    body: PNG_1x1,
  });
  expect(res.status).toBe(201);
  return (await res.json()) as UploadResponse;
}

async function loginAdmin(): Promise<string> {
  const res = await worker.fetch("https://dropimg.io/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `token=${encodeURIComponent(ADMIN)}`,
    redirect: "manual",
  });
  expect(res.status).toBe(302);
  const setCookie = res.headers.get("Set-Cookie") || "";
  expect(setCookie).toMatch(/dropimg_admin=/);
  expect(setCookie).toMatch(/HttpOnly/i);
  expect(setCookie).toMatch(/SameSite=Strict/i);
  const cookie = setCookie.split(";")[0]!;
  return cookie;
}

describe("Moderation admin", () => {
  it("rejects bad login and blocks reports without cookie", async () => {
    const bad = await worker.fetch("https://dropimg.io/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "token=wrong",
      redirect: "manual",
    });
    expect(bad.status).toBe(401);

    const reports = await worker.fetch("https://dropimg.io/admin/reports", {
      redirect: "manual",
    });
    expect(reports.status).toBe(302);
    expect(reports.headers.get("Location")).toContain("/admin/login");
  });

  it("report → remove → share 410 with delete_reason moderation", async () => {
    const uploaded = await uploadPng();

    const report = await worker.fetch("https://dropimg.io/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: uploaded.slug,
        reason: "illegal",
        detail: "test",
      }),
    });
    expect(report.status).toBe(200);

    const cookie = await loginAdmin();
    const list = await worker.fetch("https://dropimg.io/admin/reports", {
      headers: { Cookie: cookie },
    });
    expect(list.status).toBe(200);
    const html = await list.text();
    expect(html).toContain(uploaded.slug);
    expect(html).not.toContain(`<img src="/i/`);

    const env = await worker.getEnv<Cloudflare.Env>();
    const row = await env.DB.prepare(
      `SELECT id FROM reports WHERE slug = ? LIMIT 1`,
    )
      .bind(uploaded.slug)
      .first<{ id: number }>();
    expect(row?.id).toBeTruthy();

    const remove = await worker.fetch(
      `https://dropimg.io/admin/reports/${row!.id}/remove`,
      {
        method: "POST",
        headers: { Cookie: cookie },
        redirect: "manual",
      },
    );
    expect(remove.status).toBe(302);

    const share = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    expect(share.status).toBe(410);
    const gone = await share.text();
    expect(gone).toMatch(/deleted|expired/i);

    const img = await env.DB.prepare(
      `SELECT delete_reason, deleted_at FROM images WHERE slug = ?`,
    )
      .bind(uploaded.slug)
      .first<{ delete_reason: string; deleted_at: number }>();
    expect(img?.delete_reason).toBe("moderation");
    expect(img?.deleted_at).toBeTruthy();

    // Idempotent second remove
    const remove2 = await worker.fetch(
      `https://dropimg.io/admin/reports/${row!.id}/remove`,
      {
        method: "POST",
        headers: { Cookie: cookie },
        redirect: "manual",
      },
    );
    expect(remove2.status).toBe(302);
  });

  it("dismiss leaves image live", async () => {
    const uploaded = await uploadPng();
    await worker.fetch("https://dropimg.io/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: uploaded.slug, reason: "other" }),
    });

    const env = await worker.getEnv<Cloudflare.Env>();
    const row = await env.DB.prepare(
      `SELECT id FROM reports WHERE slug = ? LIMIT 1`,
    )
      .bind(uploaded.slug)
      .first<{ id: number }>();

    const cookie = await loginAdmin();
    const dismiss = await worker.fetch(
      `https://dropimg.io/admin/reports/${row!.id}/dismiss`,
      {
        method: "POST",
        headers: { Cookie: cookie },
        redirect: "manual",
      },
    );
    expect(dismiss.status).toBe(302);

    const share = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    expect(share.status).toBe(200);

    const rep = await env.DB.prepare(
      `SELECT resolution, handled_at FROM reports WHERE id = ?`,
    )
      .bind(row!.id)
      .first<{ resolution: string; handled_at: number }>();
    expect(rep?.resolution).toBe("dismissed");
    expect(rep?.handled_at).toBeTruthy();
  });
});

describe("ShareX adapter + attribution", () => {
  it("accepts multipart ShareX upload", async () => {
    const boundary = "----dropimgtest";
    const prefix = new TextEncoder().encode(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="x.png"\r\n` +
        `Content-Type: image/png\r\n` +
        `\r\n`,
    );
    const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
    const payload = new Uint8Array(
      prefix.length + PNG_1x1.length + suffix.length,
    );
    payload.set(prefix, 0);
    payload.set(PNG_1x1, prefix.length);
    payload.set(suffix, prefix.length + PNG_1x1.length);

    const res = await worker.fetch(
      "https://dropimg.io/api/integrations/sharex",
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "CF-Connecting-IP": "198.51.100.21",
        },
        body: payload,
      },
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as UploadResponse;
    expect(json.slug).toHaveLength(8);
  });

  it("accepts page_intent header and rejects free-form via normalization", async () => {
    const ok = await worker.fetch("https://dropimg.io/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "198.51.100.22",
        "X-Dropimg-Client": "web",
        "X-Dropimg-Page-Intent": "screenshot-to-link",
      },
      body: PNG_1x1,
    });
    expect(ok.status).toBe(201);

    const event = await worker.fetch("https://dropimg.io/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "landing_view",
        page_intent: "https://evil.example/x",
      }),
    });
    expect(event.status).toBe(200);

    const badEvent = await worker.fetch("https://dropimg.io/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "not_a_real_event" }),
    });
    expect(badEvent.status).toBe(400);
  });

  it("share page CTA says Paste your screenshot", async () => {
    const uploaded = await uploadPng();
    const share = await worker.fetch(`https://dropimg.io/${uploaded.slug}`);
    expect(share.status).toBe(200);
    const html = await share.text();
    expect(html).toContain("Paste your screenshot");
    expect(html).not.toContain("Share your own image");
    expect(html).toContain("ad slot share-below-image reserved");
  });
});
