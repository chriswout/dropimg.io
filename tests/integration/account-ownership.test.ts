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

async function signIn(email: string): Promise<string> {
  const started = await worker.fetch("https://dropimg.io/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "CF-Connecting-IP": "198.51.100.80",
    },
    body: JSON.stringify({ email }),
  });
  expect(started.status).toBe(200);
  const body = (await started.json()) as { devMagicUrl?: string };
  const cb = await worker.fetch(body.devMagicUrl!, { redirect: "manual" });
  expect(cb.status).toBe(302);
  return cookieFrom(cb);
}

async function anonUpload(ip = "203.0.113.40"): Promise<UploadResponse> {
  const res = await worker.fetch("https://dropimg.io/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "CF-Connecting-IP": ip,
    },
    body: PNG_1x1,
  });
  expect(res.status).toBe(201);
  return (await res.json()) as UploadResponse;
}

describe("Account ownership", () => {
  it("redirects anonymous /app to login and keeps anonymous upload unowned", async () => {
    const app = await worker.fetch("https://dropimg.io/app", { redirect: "manual" });
    expect(app.status).toBe(302);
    expect(app.headers.get("Location")).toContain("/login");

    const uploaded = await anonUpload();
    const env = await worker.getEnv();
    const row = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(uploaded.slug)
      .first<{ user_id: string | null }>();
    expect(row?.user_id).toBeNull();
  });

  it("claims local recents with a delete token and skips bad tokens", async () => {
    const cookie = await signIn("claim@example.com");
    const keep = await anonUpload("203.0.113.41");
    const other = await anonUpload("203.0.113.42");

    const res = await worker.fetch("https://dropimg.io/api/account/claim", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          { slug: keep.slug, deleteToken: keep.deleteToken },
          { slug: other.slug, deleteToken: "not-the-token" },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { claimed: number; skipped: number };
    expect(body.claimed).toBe(1);
    expect(body.skipped).toBe(1);

    const env = await worker.getEnv();
    const owned = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(keep.slug)
      .first<{ user_id: string | null }>();
    const skipped = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(other.slug)
      .first<{ user_id: string | null }>();
    expect(owned?.user_id).toBeTruthy();
    expect(skipped?.user_id).toBeNull();

    const page = await worker.fetch("https://dropimg.io/app", {
      headers: { Cookie: cookie },
    });
    expect(page.status).toBe(200);
    expect(page.headers.get("X-Robots-Tag")).toMatch(/noindex/i);
    const html = await page.text();
    expect(html).toContain(keep.slug);
    expect(html).not.toContain(other.slug);
    expect(html).toContain('class="page"');
    expect(html).toContain("brand-logo");
    expect(html).toContain('id="account-nav"');
  });

  it("account upload attaches user_id; intent is one-use", async () => {
    const cookie = await signIn("uploader@example.com");
    const intent = await worker.fetch("https://dropimg.io/api/account/upload-intent", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiry: 86400 }),
    });
    expect(intent.status).toBe(200);
    const created = (await intent.json()) as { id: string; uploadUrl: string };

    const up = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.50",
      },
      body: PNG_1x1,
    });
    expect(up.status).toBe(201);
    const uploaded = (await up.json()) as UploadResponse;

    const env = await worker.getEnv();
    const row = await env.DB.prepare(`SELECT user_id FROM images WHERE slug = ?`)
      .bind(uploaded.slug)
      .first<{ user_id: string | null }>();
    expect(row?.user_id).toBeTruthy();

    const reuse = await worker.fetch(`https://dropimg.io${created.uploadUrl}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "CF-Connecting-IP": "203.0.113.50",
      },
      body: PNG_1x1,
    });
    expect(reuse.status).toBe(400);
  });

  it("caps Free /app history at 10 and allows owned delete", async () => {
    const cookie = await signIn("history@example.com");
    const slugs: string[] = [];
    const envStamp = await worker.getEnv();
    const base = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 12; i++) {
      const uploaded = await anonUpload(`203.0.113.${60 + i}`);
      slugs.push(uploaded.slug);
      await worker.fetch("https://dropimg.io/api/account/claim", {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: "https://dropimg.io",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ slug: uploaded.slug, deleteToken: uploaded.deleteToken }],
        }),
      });
      await envStamp.DB.prepare(`UPDATE images SET created_at = ? WHERE slug = ?`)
        .bind(base + i, uploaded.slug)
        .run();
    }

    const page = await worker.fetch("https://dropimg.io/app", {
      headers: { Cookie: cookie },
    });
    const html = await page.text();
    expect(html).toContain("Showing your 10 most recent");
    expect(html).toContain(slugs[11]);
    expect(html).not.toContain(slugs[0]);
    expect(html).not.toContain(slugs[1]);

    const del = await worker.fetch(
      `https://dropimg.io/api/account/images/${slugs[11]}/delete`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://dropimg.io" },
      },
    );
    expect(del.status).toBe(200);

    const env = await worker.getEnv();
    const row = await env.DB.prepare(
      `SELECT deleted_at FROM images WHERE slug = ?`,
    )
      .bind(slugs[11])
      .first<{ deleted_at: number | null }>();
    expect(row?.deleted_at).toBeTruthy();

    const stranger = await signIn("stranger@example.com");
    const forbidden = await worker.fetch(
      `https://dropimg.io/api/account/images/${slugs[10]}/delete`,
      {
        method: "POST",
        headers: { Cookie: stranger, Origin: "https://dropimg.io" },
      },
    );
    expect(forbidden.status).toBe(404);
  });
});
