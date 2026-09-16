import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/web-assets");
const avif = new Uint8Array(readFileSync(join(fixtures, "tiny.avif")));
const ico = new Uint8Array(readFileSync(join(fixtures, "favicon.ico")));
const woff2 = new Uint8Array(readFileSync(join(fixtures, "drop-test.woff2")));
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);
const SVG = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 12h20" stroke="#111" fill="none"/></svg>',
);

const server = createTestHarness({
  workers: [
    {
      configPath: "./wrangler.integration.jsonc",
      secrets: {
        IP_HASH_SECRET: "integration-test-ip-hash-secret",
        ADMIN_TOKEN: "integration-test-admin",
      },
      vars: { ENVIRONMENT: "development", MEDIA_ENABLED: "true" },
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
  const m = /dropimg_session=([^;]+)/.exec(res.headers.get("Set-Cookie") || "");
  expect(m).toBeTruthy();
  return `dropimg_session=${m![1]}`;
}

async function signIn(email: string): Promise<string> {
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
  return cookieFrom(await worker.fetch(body.devMagicUrl!, { redirect: "manual" }));
}

function jsonHeaders(cookie: string): HeadersInit {
  return { Cookie: cookie, Origin: "https://dropimg.io", "Content-Type": "application/json" };
}

function multipart(
  file: Uint8Array,
  path: string,
  filename: string,
  mime: string,
): { body: Uint8Array; contentType: string } {
  const boundary = "----wa";
  const prefix = new TextEncoder().encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="path"\r\n\r\n${path}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mime}\r\n\r\n`,
  );
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.length + file.length + suffix.length);
  body.set(prefix, 0);
  body.set(file, prefix.length);
  body.set(suffix, prefix.length + file.length);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function bootstrap(cookie: string) {
  const org = (await (
    await worker.fetch("https://dropimg.io/api/v1/media/orgs", {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: "{}",
    })
  ).json()) as { org: { id: string; slug: string } };
  const project = (await (
    await worker.fetch(`https://dropimg.io/api/v1/media/orgs/${org.org.id}/projects`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ slug: "site", name: "Site" }),
    })
  ).json()) as { project: { id: string; slug: string } };
  const key = (await (
    await worker.fetch(`https://dropimg.io/api/v1/media/projects/${project.project.id}/keys`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ label: "keys" }),
    })
  ).json()) as { token: string };
  return { org, project, token: key.token };
}

async function upload(
  token: string,
  projectId: string,
  path: string,
  file: Uint8Array,
  filename: string,
  mime: string,
  extra?: HeadersInit,
) {
  const { body, contentType } = multipart(file, path, filename, mime);
  return worker.fetch(`https://dropimg.io/api/v1/media/projects/${projectId}/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType, ...extra },
    body,
  });
}

describe("Media web assets", () => {
  it("uploads AVIF, ICO, SVG, and WOFF2 with the right type and alias headers", async () => {
    const cookie = await signIn("web-assets@example.com");
    const ctx = await bootstrap(cookie);

    const avifRes = await upload(ctx.token, ctx.project.project.id, "hero", avif, "x.avif", "image/jpeg");
    expect(avifRes.status).toBe(201);
    const avifBody = (await avifRes.json()) as {
      asset: { url: string; mime: string; assetType: string; id: string; versionId: string };
    };
    expect(avifBody.asset.mime).toBe("image/avif");
    expect(avifBody.asset.assetType).toBe("image");
    const avifAlias = await worker.fetch(avifBody.asset.url);
    expect(avifAlias.status).toBe(200);
    expect(avifAlias.headers.get("Content-Type")).toBe("image/avif");
    expect(avifAlias.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const icoRes = await upload(ctx.token, ctx.project.project.id, "favicon", ico, "favicon.png", "image/png");
    expect(icoRes.status).toBe(201);
    const icoBody = (await icoRes.json()) as { asset: { mime: string; assetType: string; url: string } };
    expect(icoBody.asset.mime).toBe("image/x-icon");
    expect(icoBody.asset.assetType).toBe("icon");
    const icoAlias = await worker.fetch(icoBody.asset.url);
    expect(icoAlias.headers.get("Content-Type")).toBe("image/x-icon");

    const svgRes = await upload(ctx.token, ctx.project.project.id, "branding/logo", SVG, "logo.png", "image/png");
    expect(svgRes.status).toBe(201);
    const svgBody = (await svgRes.json()) as {
      asset: { mime: string; assetType: string; url: string; id: string };
    };
    expect(svgBody.asset.mime).toBe("image/svg+xml");
    expect(svgBody.asset.assetType).toBe("vector");
    const svgAlias = await worker.fetch(svgBody.asset.url);
    expect(svgAlias.status).toBe(200);
    expect(svgAlias.headers.get("Content-Type")).toMatch(/image\/svg\+xml/);
    expect(svgAlias.headers.get("Content-Security-Policy")).toMatch(/sandbox/);
    expect(svgAlias.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const svgText = await svgAlias.text();
    expect(svgText).not.toMatch(/<script/i);

    const fontRes = await upload(
      ctx.token,
      ctx.project.project.id,
      "fonts/inter",
      woff2,
      "inter.ttf",
      "application/octet-stream",
    );
    expect(fontRes.status).toBe(201);
    const fontBody = (await fontRes.json()) as {
      asset: { mime: string; assetType: string; url: string; width: number | null };
    };
    expect(fontBody.asset.mime).toBe("font/woff2");
    expect(fontBody.asset.assetType).toBe("font");
    expect(fontBody.asset.width).toBeNull();
    const fontAlias = await worker.fetch(fontBody.asset.url, {
      headers: { Origin: "https://example.com" },
    });
    expect(fontAlias.status).toBe(200);
    expect(fontAlias.headers.get("Content-Type")).toBe("font/woff2");
    expect(fontAlias.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const preflight = await worker.fetch(fontBody.asset.url, { method: "OPTIONS" });
    expect(preflight.status).toBe(204);

    const listed = await worker.fetch(
      `https://dropimg.io/api/v1/media/projects/${ctx.project.project.id}/assets`,
      { headers: { Authorization: `Bearer ${ctx.token}` } },
    );
    const listBody = (await listed.json()) as { assets: Array<{ path: string; assetType: string }> };
    expect(listBody.assets.map((a) => a.path).sort()).toEqual([
      "branding/logo",
      "favicon",
      "fonts/inter",
      "hero",
    ]);
  });

  it("allows replacing SVG with PNG on the same alias", async () => {
    const cookie = await signIn("web-assets-replace@example.com");
    const ctx = await bootstrap(cookie);
    const created = await upload(ctx.token, ctx.project.project.id, "branding/logo", SVG, "logo.svg", "image/svg+xml");
    const createdBody = (await created.json()) as {
      asset: { id: string; url: string; versionId: string; mime: string };
    };
    expect(createdBody.asset.mime).toBe("image/svg+xml");
    const boundary = "----r";
    const prefix = new TextEncoder().encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="logo.png"\r\nContent-Type: image/png\r\n\r\n`,
    );
    const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(prefix.length + PNG.length + suffix.length);
    body.set(prefix, 0);
    body.set(PNG, prefix.length);
    body.set(suffix, prefix.length + PNG.length);
    const replaced = await worker.fetch(
      `https://dropimg.io/api/v1/media/assets/${createdBody.asset.id}/versions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      },
    );
    expect(replaced.status).toBe(201);
    const replacedBody = (await replaced.json()) as { asset: { url: string; mime: string; assetType: string } };
    expect(replacedBody.asset.url).toBe(createdBody.asset.url);
    expect(replacedBody.asset.mime).toBe("image/png");
    expect(replacedBody.asset.assetType).toBe("image");
    const now = await worker.fetch(createdBody.asset.url);
    expect(now.headers.get("Content-Type")).toBe("image/png");
    const old = await worker.fetch(`${createdBody.asset.url}?v=${createdBody.asset.versionId}`);
    expect(old.headers.get("Content-Type")).toMatch(/image\/svg\+xml/);
  });

  it("rejects malicious SVG and unsupported blobs", async () => {
    const cookie = await signIn("web-assets-reject@example.com");
    const ctx = await bootstrap(cookie);
    const evil = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const evilRes = await upload(ctx.token, ctx.project.project.id, "xss", evil, "x.svg", "image/svg+xml");
    expect(evilRes.status).toBe(422);
    const fixtures = [
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/x.svg#icon"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("https://evil.example/x.css");</style></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+"/></svg>',
    ];
    for (const [i, xml] of fixtures.entries()) {
      const res = await upload(
        ctx.token,
        ctx.project.project.id,
        `evil-${i}`,
        new TextEncoder().encode(xml),
        "x.svg",
        "image/svg+xml",
      );
      expect(res.status, xml.slice(0, 40)).toBe(422);
    }
    const pdf = await upload(
      ctx.token,
      ctx.project.project.id,
      "doc",
      new TextEncoder().encode("%PDF-1.4"),
      "x.pdf",
      "application/pdf",
    );
    expect(pdf.status).toBe(415);
    const drop = await worker.fetch("https://dropimg.io/api/upload", {
      method: "POST",
      headers: { "Content-Type": "image/svg+xml" },
      body: SVG,
    });
    expect(drop.status).toBeGreaterThanOrEqual(400);
  });

  it("replays AVIF create with idempotency and deletes the alias", async () => {
    const cookie = await signIn("web-assets-idemp@example.com");
    const ctx = await bootstrap(cookie);
    const first = await upload(ctx.token, ctx.project.project.id, "hero", avif, "x.avif", "image/avif", {
      "Idempotency-Key": "avif-1",
    });
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { asset: { id: string; url: string } };
    const replay = await upload(ctx.token, ctx.project.project.id, "hero", avif, "x.avif", "image/avif", {
      "Idempotency-Key": "avif-1",
    });
    expect(replay.status).toBe(201);
    expect(((await replay.json()) as { asset: { id: string } }).asset.id).toBe(firstBody.asset.id);
    const del = await worker.fetch(`https://dropimg.io/api/v1/media/assets/${firstBody.asset.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    expect(del.status).toBe(200);
    expect((await worker.fetch(firstBody.asset.url)).status).toBe(404);
  });
});
