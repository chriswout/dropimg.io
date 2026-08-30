import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { createSession } from "../../src/lib/auth/session";

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

async function startLogin(email: string) {
  const res = await worker.fetch("https://dropimg.io/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "CF-Connecting-IP": "198.51.100.40",
    },
    body: JSON.stringify({ email }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { ok: boolean; maskedEmail: string; devMagicUrl?: string };
}

function cookieFrom(res: Response): string {
  const set = res.headers.get("Set-Cookie") || "";
  const m = /dropimg_session=([^;]+)/.exec(set);
  expect(m).toBeTruthy();
  return `dropimg_session=${m![1]}`;
}

describe("Auth magic link", () => {
  it("serves noindex login and anonymous /me", async () => {
    const login = await worker.fetch("https://dropimg.io/login");
    expect(login.status).toBe(200);
    expect(login.headers.get("X-Robots-Tag")).toMatch(/noindex/i);
    const html = await login.text();
    expect(html).toContain("Sign in to DropIMG");
    expect(html).toContain("No password required");
    expect(html).toContain('class="page"');
    expect(html).toContain("brand-logo");
    expect(html).toContain('id="account-nav"');

    const me = await worker.fetch("https://dropimg.io/api/account/me");
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: null; entitlements: { plan: string } };
    expect(body.user).toBeNull();
    expect(body.entitlements.plan).toBe("anonymous");
  });

  it("creates a one-time session and rejects reuse / invalid cookie", async () => {
    const started = await startLogin("user@example.com");
    expect(started.maskedEmail).toBe("u***@example.com");
    expect(started.devMagicUrl).toContain("/auth/callback?token=");

    const cb = await worker.fetch(started.devMagicUrl!, { redirect: "manual" });
    expect(cb.status).toBe(302);
    expect(cb.headers.get("Location")).toBe("/");
    const cookie = cookieFrom(cb);
    expect(cb.headers.get("Set-Cookie")).toMatch(/HttpOnly/i);
    expect(cb.headers.get("Set-Cookie")).toMatch(/SameSite=Lax/i);

    const me = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const meBody = (await me.json()) as {
      user: { email: string };
      entitlements: { plan: string };
    };
    expect(meBody.user.email).toBe("user@example.com");
    expect(meBody.entitlements.plan).toBe("free");

    const reuse = await worker.fetch(started.devMagicUrl!, { redirect: "manual" });
    expect(reuse.status).toBe(400);

    const bad = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: "dropimg_session=not-a-real-token" },
    });
    const badBody = (await bad.json()) as { user: null };
    expect(badBody.user).toBeNull();
  });

  it("rejects expired magic links", async () => {
    const started = await startLogin("expire@example.com");
    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`UPDATE magic_links SET expires_at = ?`)
      .bind(now - 10)
      .run();
    const cb = await worker.fetch(started.devMagicUrl!, { redirect: "manual" });
    expect(cb.status).toBe(400);
  });

  it("logout requires origin and clears the current session", async () => {
    const started = await startLogin("out@example.com");
    const cb = await worker.fetch(started.devMagicUrl!, { redirect: "manual" });
    const cookie = cookieFrom(cb);

    const forbidden = await worker.fetch("https://dropimg.io/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(forbidden.status).toBe(403);

    const ok = await worker.fetch("https://dropimg.io/api/auth/logout", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
      },
    });
    expect(ok.status).toBe(200);
    const me = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const body = (await me.json()) as { user: null };
    expect(body.user).toBeNull();
  });

  it("sign out all devices revokes every session", async () => {
    const a = await startLogin("multi@example.com");
    const cb1 = await worker.fetch(a.devMagicUrl!, { redirect: "manual" });
    const cookie1 = cookieFrom(cb1);

    const me = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie1 },
    });
    const user = (await me.json()) as { user: { id: string } };
    const env = await worker.getEnv();
    const second = await createSession(env.DB, user.user.id);
    const cookie2 = `dropimg_session=${second.token}`;

    const all = await worker.fetch("https://dropimg.io/api/auth/logout-all", {
      method: "POST",
      headers: {
        Cookie: cookie1,
        Origin: "https://dropimg.io",
      },
    });
    expect(all.status).toBe(200);

    for (const cookie of [cookie1, cookie2]) {
      const me = await worker.fetch("https://dropimg.io/api/account/me", {
        headers: { Cookie: cookie },
      });
      const body = (await me.json()) as { user: null };
      expect(body.user).toBeNull();
    }
  });

  it("exposes Pro entitlements from the subscription row", async () => {
    const started = await startLogin("pro@example.com");
    const cb = await worker.fetch(started.devMagicUrl!, { redirect: "manual" });
    const cookie = cookieFrom(cb);
    const me1 = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const free = (await me1.json()) as {
      user: { id: string };
      entitlements: { plan: string };
    };
    expect(free.entitlements.plan).toBe("free");

    const env = await worker.getEnv();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, provider, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'paddle', 'active', ?, 1, ?, ?)`,
    )
      .bind("sub1", free.user.id, now + 86400, now, now)
      .run();

    const me2 = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const pro = (await me2.json()) as {
      entitlements: { plan: string; adFree: boolean; passwordProtection: boolean };
    };
    expect(pro.entitlements.plan).toBe("pro");
    expect(pro.entitlements.adFree).toBe(true);
    expect(pro.entitlements.passwordProtection).toBe(true);
  });

  it("serves the settings pages when signed in and rejects delete without a session", async () => {
    const started = await startLogin("settings@example.com");
    const cb = await worker.fetch(started.devMagicUrl!, { redirect: "manual" });
    const cookie = cookieFrom(cb);

    for (const path of ["/account", "/app/integrations", "/app/billing", "/app/account"]) {
      const anon = await worker.fetch(`https://dropimg.io${path}`, {
        redirect: "manual",
      });
      expect(anon.status, path).toBe(302);
      expect(anon.headers.get("Location"), path).toBe("/login");
    }

    // /account is hard-coded in shipped extension builds; it must stay a real
    // page and land on the screen that mints a token.
    const compat = await worker.fetch("https://dropimg.io/account", {
      headers: { Cookie: cookie },
    });
    expect(compat.status).toBe(200);
    expect(await compat.text()).toContain("Connect extension");

    const page = await worker.fetch("https://dropimg.io/app/account", {
      headers: { Cookie: cookie },
    });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("settings@example.com");
    expect(html).toContain("Delete account");

    const denied = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: { Origin: "https://dropimg.io" },
    });
    expect(denied.status).toBe(401);

    const deleted = await worker.fetch("https://dropimg.io/api/account/delete", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
      },
    });
    expect(deleted.status).toBe(200);

    const me = await worker.fetch("https://dropimg.io/api/account/me", {
      headers: { Cookie: cookie },
    });
    const body = (await me.json()) as { user: null };
    expect(body.user).toBeNull();
  });
});
