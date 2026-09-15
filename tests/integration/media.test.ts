import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { PHASE1_PERM_STORAGE_BYTES } from "../../src/lib/media-config";

const PNG_1x1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const GIF_1x1 = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const server = createTestHarness({
  workers: [
    {
      configPath: "./wrangler.integration.jsonc",
      secrets: {
        IP_HASH_SECRET: "integration-test-ip-hash-secret",
        ADMIN_TOKEN: "integration-test-admin",
        PAYPAL_CLIENT_SECRET: "",
      },
      vars: {
        ENVIRONMENT: "development",
        LONG_TTL_ENABLED: "true",
        PRO_50MB_ENABLED: "false",
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

async function signIn(email: string): Promise<{ cookie: string; userId: string }> {
  const started = await worker.fetch("https://dropimg.io/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "CF-Connecting-IP": "198.51.100.81",
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

function jsonHeaders(cookie: string): HeadersInit {
  return {
    Cookie: cookie,
    Origin: "https://dropimg.io",
    "Content-Type": "application/json",
  };
}

function multipart(
  file: Uint8Array,
  fields: Record<string, string>,
  filename = "x.png",
  mime = "image/png",
): { body: Uint8Array; contentType: string } {
  const boundary = "----dropimgmedia";
  let extras = "";
  for (const [name, value] of Object.entries(fields)) {
    extras += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  }
  const prefix = new TextEncoder().encode(
    extras +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mime}\r\n` +
      `\r\n`,
  );
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const payload = new Uint8Array(prefix.length + file.length + suffix.length);
  payload.set(prefix, 0);
  payload.set(file, prefix.length);
  payload.set(suffix, prefix.length + file.length);
  return { body: payload, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function bootstrapProject(cookie: string): Promise<{
  orgId: string;
  orgSlug: string;
  projectId: string;
  projectSlug: string;
  token: string;
}> {
  const orgRes = await worker.fetch("https://dropimg.io/api/v1/media/orgs", {
    method: "POST",
    headers: jsonHeaders(cookie),
    body: "{}",
  });
  expect(orgRes.status).toBe(200);
  const orgBody = (await orgRes.json()) as { org: { id: string; slug: string } };

  const projectRes = await worker.fetch(
    `https://dropimg.io/api/v1/media/orgs/${orgBody.org.id}/projects`,
    {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ slug: "website", name: "Website" }),
    },
  );
  expect(projectRes.status).toBe(201);
  const projectBody = (await projectRes.json()) as {
    project: { id: string; slug: string };
  };

  const keyRes = await worker.fetch(
    `https://dropimg.io/api/v1/media/projects/${projectBody.project.id}/keys`,
    {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ label: "CI key" }),
    },
  );
  expect(keyRes.status).toBe(201);
  const keyBody = (await keyRes.json()) as { token: string };
  expect(keyBody.token.startsWith("dropimg_pk_")).toBe(true);

  return {
    orgId: orgBody.org.id,
    orgSlug: orgBody.org.slug,
    projectId: projectBody.project.id,
    projectSlug: projectBody.project.slug,
    token: keyBody.token,
  };
}

describe("permanent media", () => {
  it("ingests an original, serves the alias, and replaces without changing the public URL", async () => {
    const { cookie } = await signIn("media-a@example.com");
    const env = await worker.getEnv<Cloudflare.Env>();
    const imagesBefore = await env.DB.prepare(`SELECT COUNT(*) AS cnt FROM images`).first<{
      cnt: number;
    }>();

    const ctx = await bootstrapProject(cookie);
    const imagesAfter = await env.DB.prepare(`SELECT COUNT(*) AS cnt FROM images`).first<{
      cnt: number;
    }>();
    expect(imagesAfter?.cnt).toBe(imagesBefore?.cnt);

    const { body, contentType } = multipart(PNG_1x1, { path: "website/header" });
    const created = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": contentType,
          "Idempotency-Key": "header-v1",
        },
        body,
      },
    );
    expect(created.status).toBe(201);
    expect(created.headers.get("X-Request-Id")).toBeTruthy();
    const createdBody = (await created.json()) as {
      asset: {
        id: string;
        url: string;
        versionId: string;
        mime: string;
        path: string;
      };
    };
    expect(createdBody.asset.path).toBe("website/header");
    expect(createdBody.asset.url).toBe(
      `https://dropimg.io/m/${ctx.orgSlug}/${ctx.projectSlug}/website/header`,
    );
    expect(createdBody.asset.mime).toBe("image/png");

    const replay = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": contentType,
          "Idempotency-Key": "header-v1",
        },
        body,
      },
    );
    expect(replay.status).toBe(201);
    const replayBody = (await replay.json()) as { asset: { id: string } };
    expect(replayBody.asset.id).toBe(createdBody.asset.id);

    const alias = await worker.fetch(createdBody.asset.url);
    expect(alias.status).toBe(200);
    expect(alias.headers.get("Content-Type")).toBe("image/png");
    expect(alias.headers.get("X-Robots-Tag")).toMatch(/noindex/i);
    expect(alias.headers.get("Cache-Control")).toMatch(/max-age=300/);
    const aliasBytes = new Uint8Array(await alias.arrayBuffer());
    expect(aliasBytes[0]).toBe(0x89);

    const oldVersionId = createdBody.asset.versionId;
    const { body: gifBody, contentType: gifType } = multipart(
      GIF_1x1,
      {},
      "x.gif",
      "image/gif",
    );
    const replaced = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${createdBody.asset.id}/versions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": gifType,
        },
        body: gifBody,
      },
    );
    expect(replaced.status).toBe(201);
    const replacedBody = (await replaced.json()) as {
      asset: { url: string; versionId: string; mime: string };
    };
    expect(replacedBody.asset.url).toBe(createdBody.asset.url);
    expect(replacedBody.asset.versionId).not.toBe(oldVersionId);
    expect(replacedBody.asset.mime).toBe("image/gif");

    const aliasNow = await worker.fetch(createdBody.asset.url);
    expect(aliasNow.status).toBe(200);
    expect(aliasNow.headers.get("Content-Type")).toBe("image/gif");
    const gifBytes = new Uint8Array(await aliasNow.arrayBuffer());
    expect(gifBytes[0]).toBe(0x47);

    const oldVersion = await worker.fetch(`${createdBody.asset.url}?v=${oldVersionId}`);
    expect(oldVersion.status).toBe(200);
    expect(oldVersion.headers.get("Content-Type")).toBe("image/png");
    expect(oldVersion.headers.get("Cache-Control")).toMatch(/immutable/);

    const keys = await env.DB.prepare(
      `SELECT r2_key FROM asset_versions WHERE asset_id = ? ORDER BY created_at`,
    )
      .bind(createdBody.asset.id)
      .all<{ r2_key: string }>();
    expect(keys.results?.length).toBe(2);
    expect(keys.results?.[0]?.r2_key).not.toBe(keys.results?.[1]?.r2_key);
    expect(keys.results?.[0]?.r2_key.startsWith("p/")).toBe(true);
    expect(await env.BUCKET.head(keys.results![0]!.r2_key)).toBeTruthy();
    expect(await env.BUCKET.head(keys.results![1]!.r2_key)).toBeTruthy();
  });

  it("returns 404 when another user reads an asset UUID", async () => {
    const a = await signIn("media-owner@example.com");
    const ctx = await bootstrapProject(a.cookie);
    const { body, contentType } = multipart(PNG_1x1, { path: "logo" });
    const created = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": contentType,
        },
        body,
      },
    );
    const createdBody = (await created.json()) as { asset: { id: string; url: string } };

    const b = await signIn("media-b@example.com");
    const peek = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${createdBody.asset.id}`,
      { headers: { Cookie: b.cookie } },
    );
    expect(peek.status).toBe(404);
    const peekBody = (await peek.json()) as { code: string };
    expect(peekBody.code).toBe("not_found");

    const otherProject = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      { headers: { Cookie: b.cookie } },
    );
    expect(otherProject.status).toBe(404);

    const publicAlias = await worker.fetch(createdBody.asset.url);
    expect(publicAlias.status).toBe(200);
  });

  it("rejects session writes without CSRF origin", async () => {
    const { cookie } = await signIn("media-csrf@example.com");
    const res = await worker.fetch("https://dropimg.io/api/v1/media/orgs", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(res.status).toBe(403);
  });

  it("rejects uploads that would exceed the phase-1 storage quota", async () => {
    const { cookie } = await signIn("media-quota@example.com");
    const ctx = await bootstrapProject(cookie);
    const env = await worker.getEnv<Cloudflare.Env>();
    await env.DB.prepare(
      `INSERT INTO usage_events
        (id, org_id, project_id, meter, delta, idempotency_key, occurred_at, source)
       VALUES (?, ?, ?, 'storage_original_bytes', ?, 'quota-fill', ?, 'api')`,
    )
      .bind(
        crypto.randomUUID(),
        ctx.orgId,
        ctx.projectId,
        PHASE1_PERM_STORAGE_BYTES,
        Math.floor(Date.now() / 1000),
      )
      .run();

    const { body, contentType } = multipart(PNG_1x1, { path: "overflow" });
    const created = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": contentType,
        },
        body,
      },
    );
    expect(created.status).toBe(413);
    const payload = (await created.json()) as { code: string };
    expect(payload.code).toBe("quota_exceeded");
  });

  it("does not let cron delete p/ originals", async () => {
    const env = await worker.getEnv<Cloudflare.Env>();
    const key = "p/org/proj/asset/ver/original";
    await env.BUCKET.put(key, PNG_1x1);
    const result = await worker.scheduled({
      cron: "*/5 * * * *",
      scheduledTime: new Date(),
    });
    expect(result.outcome).toBe("ok");
    expect(await env.BUCKET.head(key)).toBeTruthy();
  });

  it("blocks account delete while the user owns live media assets", async () => {
    const { cookie } = await signIn("media-delete@example.com");
    const ctx = await bootstrapProject(cookie);
    const { body, contentType } = multipart(PNG_1x1, { path: "keep" });
    const created = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": contentType,
        },
        body,
      },
    );
    expect(created.status).toBe(201);

    const del = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: jsonHeaders(cookie),
    });
    expect(del.status).toBe(409);
  });

  it("revokes project keys when an account with no live assets is deleted", async () => {
    const { cookie } = await signIn("media-empty-delete@example.com");
    const ctx = await bootstrapProject(cookie);
    const del = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: jsonHeaders(cookie),
    });
    expect(del.status).toBe(200);

    const listed = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      { headers: { Authorization: `Bearer ${ctx.token}` } },
    );
    expect(listed.status).toBe(401);
  });
});
