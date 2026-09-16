import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { parseIdempotencyHeader } from "../../src/lib/media-store";

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
      "CF-Connecting-IP": "198.51.100.82",
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
  const boundary = "----dropimgmedia2";
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

async function bootstrapProject(
  cookie: string,
  slug = "website",
): Promise<{
  orgId: string;
  orgSlug: string;
  projectId: string;
  projectSlug: string;
  token: string;
  keyId: string;
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
      body: JSON.stringify({ slug, name: slug }),
    },
  );
  expect(projectRes.status).toBe(201);
  const projectBody = (await projectRes.json()) as {
    project: { id: string; slug: string; url: string };
  };
  expect(projectBody.project.url).toContain(`/m/${orgBody.org.slug}/${slug}/`);
  const keyRes = await worker.fetch(
    `https://dropimg.io/api/v1/media/projects/${projectBody.project.id}/keys`,
    {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ label: "CI key" }),
    },
  );
  expect(keyRes.status).toBe(201);
  const keyBody = (await keyRes.json()) as { id: string; token: string };
  return {
    orgId: orgBody.org.id,
    orgSlug: orgBody.org.slug,
    projectId: projectBody.project.id,
    projectSlug: projectBody.project.slug,
    token: keyBody.token,
    keyId: keyBody.id,
  };
}

async function uploadAsset(token: string, projectId: string, path: string) {
  const { body, contentType } = multipart(PNG_1x1, { path });
  const created = await worker.fetch(
    `https://dropimg.io/api/v1/media/projects/${projectId}/assets`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
      body,
    },
  );
  expect(created.status).toBe(201);
  return (await created.json()) as { asset: { id: string; url: string; versionId: string } };
}

describe("project key lifecycle", () => {
  it("lists metadata only and revokes immediately", async () => {
    const { cookie } = await signIn("keys-a@example.com");
    const ctx = await bootstrapProject(cookie);
    const listed = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/keys`,
      { headers: { Cookie: cookie } },
    );
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as {
      keys: Array<{ id: string; token?: string; prefix: string; status: string }>;
    };
    expect(listBody.keys[0]?.id).toBe(ctx.keyId);
    expect(listBody.keys[0]?.prefix.startsWith("dropimg_pk_")).toBe(true);
    expect(JSON.stringify(listBody)).not.toMatch(/token_hash/);
    expect(listBody.keys[0]?.token).toBeUndefined();

    const revoked = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/keys/${ctx.keyId}/revoke`,
      { method: "POST", headers: jsonHeaders(cookie), body: "{}" },
    );
    expect(revoked.status).toBe(200);
    const listedAfter = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      { headers: { Authorization: `Bearer ${ctx.token}` } },
    );
    expect(listedAfter.status).toBe(401);
  });

  it("does not leak keys across projects or orgs", async () => {
    const a = await signIn("keys-owner@example.com");
    const projectA = await bootstrapProject(a.cookie, "alpha");
    const projectB = await bootstrapProject(a.cookie, "beta");
    const b = await signIn("keys-other@example.com");
    await bootstrapProject(b.cookie, "website");

    const crossProject = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${projectB.projectId}/keys/${projectA.keyId}/revoke`,
      { method: "POST", headers: jsonHeaders(a.cookie), body: "{}" },
    );
    expect(crossProject.status).toBe(404);

    const crossOrg = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${projectA.projectId}/keys`,
      { headers: { Cookie: b.cookie } },
    );
    expect(crossOrg.status).toBe(404);

    const stillWorks = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${projectA.projectId}/assets`,
      { headers: { Authorization: `Bearer ${projectA.token}` } },
    );
    expect(stillWorks.status).toBe(200);
  });

  it("rejects expired project keys", async () => {
    const { cookie } = await signIn("keys-exp@example.com");
    const ctx = await bootstrapProject(cookie);
    const env = await worker.getEnv<Cloudflare.Env>();
    await env.DB.prepare(
      `UPDATE project_credentials SET expires_at = ? WHERE id = ?`,
    )
      .bind(Math.floor(Date.now() / 1000) - 10, ctx.keyId)
      .run();
    const listed = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      { headers: { Authorization: `Bearer ${ctx.token}` } },
    );
    expect(listed.status).toBe(401);
  });
});

describe("asset delete", () => {
  it("stops the alias, blocks replace, and allows account deletion after the last asset", async () => {
    const { cookie } = await signIn("del-a@example.com");
    const ctx = await bootstrapProject(cookie);
    const created = await uploadAsset(ctx.token, ctx.projectId, "logo");
    const oldVersion = created.asset.versionId;

    const del = await worker.fetch(`https://dropimg.io/api/v1/media/assets/${created.asset.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    expect(del.status).toBe(200);
    expect((await worker.fetch(created.asset.url)).status).toBe(404);
    expect((await worker.fetch(`${created.asset.url}?v=${oldVersion}`)).status).toBe(404);

    const { body, contentType } = multipart(GIF_1x1, {}, "x.gif", "image/gif");
    const replace = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${created.asset.id}/versions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": contentType },
        body,
      },
    );
    expect(replace.status).toBe(404);

    const again = await worker.fetch(`https://dropimg.io/api/v1/media/assets/${created.asset.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    expect(again.status).toBe(404);

    const missing = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${crypto.randomUUID()}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${ctx.token}` } },
    );
    expect(missing.status).toBe(404);

    const account = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: jsonHeaders(cookie),
    });
    expect(account.status).toBe(200);
  });

  it("keeps tenant isolation on delete", async () => {
    const a = await signIn("del-owner@example.com");
    const ctx = await bootstrapProject(a.cookie);
    const created = await uploadAsset(ctx.token, ctx.projectId, "logo");
    const otherProject = await bootstrapProject(a.cookie, "other");
    const b = await signIn("del-other@example.com");
    await bootstrapProject(b.cookie);

    expect(
      (
        await worker.fetch(`https://dropimg.io/api/v1/media/assets/${created.asset.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${otherProject.token}` },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await worker.fetch(`https://dropimg.io/api/v1/media/assets/${created.asset.id}`, {
          method: "DELETE",
          headers: { Cookie: b.cookie, Origin: "https://dropimg.io" },
        })
      ).status,
    ).toBe(404);
    expect((await worker.fetch(created.asset.url)).status).toBe(200);
  });
});

describe("idempotency and concurrent replace", () => {
  it("replays create and replace, and rejects cross-operation reuse", async () => {
    const { cookie } = await signIn("idem-a@example.com");
    const ctx = await bootstrapProject(cookie);
    const { body, contentType } = multipart(PNG_1x1, { path: "hero" });
    const first = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": contentType,
          "Idempotency-Key": "same-create",
        },
        body,
      },
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { asset: { id: string } };
    const { body: body2, contentType: type2 } = multipart(PNG_1x1, { path: "hero-2" });
    const replay = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": type2,
          "Idempotency-Key": "same-create",
        },
        body: body2,
      },
    );
    expect(replay.status).toBe(201);
    expect(((await replay.json()) as { asset: { id: string } }).asset.id).toBe(firstBody.asset.id);

    const { body: gif, contentType: gifType } = multipart(GIF_1x1, {}, "x.gif", "image/gif");
    const replaced = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${firstBody.asset.id}/versions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": gifType,
          "Idempotency-Key": "same-replace",
        },
        body: gif,
      },
    );
    expect(replaced.status).toBe(201);
    const { body: gif2, contentType: gifType2 } = multipart(GIF_1x1, {}, "x.gif", "image/gif");
    const replaceReplay = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${firstBody.asset.id}/versions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": gifType2,
          "Idempotency-Key": "same-replace",
        },
        body: gif2,
      },
    );
    expect(replaceReplay.status).toBe(201);

    const { body: gif3, contentType: gifType3 } = multipart(GIF_1x1, {}, "x.gif", "image/gif");
    const collision = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${firstBody.asset.id}/versions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": gifType3,
          "Idempotency-Key": "same-create",
        },
        body: gif3,
      },
    );
    expect(collision.status).toBe(409);
  });

  it("scopes the same key per project and rejects oversized keys", async () => {
    const { cookie } = await signIn("idem-b@example.com");
    const a = await bootstrapProject(cookie, "one");
    const b = await bootstrapProject(cookie, "two");
    const { body, contentType } = multipart(PNG_1x1, { path: "shared" });
    const first = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${a.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${a.token}`,
          "Content-Type": contentType,
          "Idempotency-Key": "project-key",
        },
        body,
      },
    );
    expect(first.status).toBe(201);
    const { body: body2, contentType: type2 } = multipart(PNG_1x1, { path: "shared" });
    const second = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${b.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${b.token}`,
          "Content-Type": type2,
          "Idempotency-Key": "project-key",
        },
        body: body2,
      },
    );
    expect(second.status).toBe(201);
    expect(((await second.json()) as { asset: { id: string } }).asset.id).not.toBe(
      ((await first.json()) as { asset: { id: string } }).asset.id,
    );

    const oversized = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${a.projectId}/assets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${a.token}`,
          "Content-Type": contentType,
          "Idempotency-Key": "k".repeat(129),
        },
        body,
      },
    );
    expect(oversized.status).toBe(400);
  });

  it("does not bill a lost concurrent replace", async () => {
    const { cookie } = await signIn("race@example.com");
    const ctx = await bootstrapProject(cookie);
    const created = await uploadAsset(ctx.token, ctx.projectId, "race");
    const gif = multipart(GIF_1x1, {}, "x.gif", "image/gif");
    const png = multipart(PNG_1x1, {}, "x.png", "image/png");
    const [one, two] = await Promise.all([
      worker.fetch(`https://dropimg.io/api/v1/media/assets/${created.asset.id}/versions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": gif.contentType },
        body: gif.body,
      }),
      worker.fetch(`https://dropimg.io/api/v1/media/assets/${created.asset.id}/versions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": png.contentType },
        body: png.body,
      }),
    ]);
    const statuses = [one.status, two.status];
    expect(statuses.some((status) => status === 201)).toBe(true);
    const env = await worker.getEnv<Cloudflare.Env>();
    const versions = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(byte_size), 0) AS bytes
       FROM asset_versions WHERE asset_id = ?`,
    )
      .bind(created.asset.id)
      .first<{ cnt: number; bytes: number }>();
    expect(Number(versions?.cnt) === 2 || Number(versions?.cnt) === 3).toBe(true);
    const usage = await env.DB.prepare(
      `SELECT COALESCE(SUM(delta), 0) AS bytes FROM usage_events
       WHERE org_id = ? AND meter = 'storage_original_bytes'`,
    )
      .bind(ctx.orgId)
      .first<{ bytes: number }>();
    expect(Number(usage?.bytes)).toBe(Number(versions?.bytes));
    expect([one.status, two.status].includes(201)).toBe(true);
    expect([one.status, two.status].every((status) => status === 201 || status === 409)).toBe(
      true,
    );
  });
});

describe("upload intents", () => {
  it("finalizes create and replace over HTTP and rejects replay/expiry/mismatch", async () => {
    const { cookie } = await signIn("intent-a@example.com");
    const ctx = await bootstrapProject(cookie);
    const createdIntent = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/intents`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "create", path: "from-intent" }),
      },
    );
    expect(createdIntent.status).toBe(201);
    const intent = (await createdIntent.json()) as {
      intent: {
        id: string;
        uploadUrl: string;
        headers: { Authorization: string };
        assetId: string | null;
      };
    };
    const uploaded = await worker.fetch(intent.intent.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: intent.intent.headers.Authorization,
        "Content-Type": "application/octet-stream",
      },
      body: PNG_1x1,
    });
    expect(uploaded.status).toBe(201);
    const asset = (await uploaded.json()) as { asset: { id: string; url: string } };
    expect(asset.asset.url).toContain("/m/");
    expect((await worker.fetch(asset.asset.url)).status).toBe(200);

    const replay = await worker.fetch(intent.intent.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: intent.intent.headers.Authorization,
        "Content-Type": "application/octet-stream",
      },
      body: PNG_1x1,
    });
    expect(replay.status).toBe(409);

    const replaceIntentRes = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/intents`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "replace", assetId: asset.asset.id }),
      },
    );
    const replaceIntent = (await replaceIntentRes.json()) as {
      intent: { id: string; uploadUrl: string; headers: { Authorization: string } };
    };
    const mismatch = await worker.fetch(replaceIntent.intent.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: replaceIntent.intent.headers.Authorization,
        "Content-Type": "application/octet-stream",
        "X-Dropimg-Path": "altered",
      },
      body: GIF_1x1,
    });
    expect(mismatch.status).toBe(400);

    const other = await bootstrapProject(cookie, "other");
    const wrongProject = await worker.fetch(replaceIntent.intent.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: replaceIntent.intent.headers.Authorization,
        "Content-Type": "application/octet-stream",
        "X-Dropimg-Project-Id": other.projectId,
      },
      body: GIF_1x1,
    });
    expect(wrongProject.status).toBe(400);

    const expiredRes = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.projectId}/intents`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "create", path: "expired" }),
      },
    );
    const expiredIntent = (await expiredRes.json()) as {
      intent: { id: string; headers: { Authorization: string }; uploadUrl: string };
    };
    const env = await worker.getEnv<Cloudflare.Env>();
    await env.DB.prepare(`UPDATE media_upload_intents SET expires_at = ? WHERE id = ?`)
      .bind(Math.floor(Date.now() / 1000) - 5, expiredIntent.intent.id)
      .run();
    const expired = await worker.fetch(expiredIntent.intent.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: expiredIntent.intent.headers.Authorization,
        "Content-Type": "application/octet-stream",
      },
      body: PNG_1x1,
    });
    expect(expired.status).toBe(401);

    const anon = await worker.fetch(replaceIntent.intent.uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: GIF_1x1,
    });
    expect(anon.status).toBe(401);
  });
});

describe("media app shell", () => {
  it("renders the Media workspace for a signed-in user", async () => {
    const { cookie } = await signIn("ui@example.com");
    const page = await worker.fetch("https://dropimg.io/app/media", {
      headers: { Cookie: cookie },
    });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toMatch(/Web Assets/);
    expect(html).toMatch(/My Drops are temporary/);
  });
});

describe("idempotency header parsing", () => {
  it("rejects empty, oversized, and control characters", () => {
    expect(parseIdempotencyHeader(undefined).present).toBe(false);
    expect(parseIdempotencyHeader("ok").present && parseIdempotencyHeader("ok").ok).toBe(true);
    const long = parseIdempotencyHeader("k".repeat(129));
    expect(long.present && !long.ok && long.code === "idempotency_key_too_long").toBe(true);
    const bad = parseIdempotencyHeader("bad\nkey");
    expect(bad.present && !bad.ok && bad.code === "invalid_idempotency_key").toBe(true);
  });
});
