import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

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
        PRO_50MB_ENABLED: "false",
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
      "CF-Connecting-IP": "198.51.100.40",
    },
    body: JSON.stringify({ email }),
  });
  const body = (await started.json()) as { devMagicUrl?: string };
  const cb = await worker.fetch(body.devMagicUrl!, { redirect: "manual" });
  return cookieFrom(cb);
}

async function startPairing() {
  const res = await worker.fetch("https://dropimg.io/api/integrations/browser/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: "chrome-extension" }),
  });
  expect(res.status).toBe(200);
  return res.json() as Promise<{
    pairingId: string;
    deviceSecret: string;
    verificationUrl: string;
    expiresIn: number;
  }>;
}

async function status(pairingId: string, deviceSecret: string) {
  return worker.fetch("https://dropimg.io/api/integrations/browser/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingId, deviceSecret }),
  });
}

describe("browser extension pairing", () => {
  it("starts pending, requires sign-in to approve, then returns the token once", async () => {
    const started = await startPairing();
    expect(started.verificationUrl).toContain(`/connect/browser/${started.pairingId}`);
    expect(started.verificationUrl).not.toContain(started.deviceSecret);
    expect(started.expiresIn).toBe(300);

    const pending = await status(started.pairingId, started.deviceSecret);
    expect(pending.status).toBe(200);
    expect(await pending.json()).toEqual({ status: "pending" });

    const open = await worker.fetch(started.verificationUrl, { redirect: "manual" });
    expect(open.status).toBe(302);
    expect(open.headers.get("Location")).toBe(`/login?next=/connect/browser/${started.pairingId}`);

    const cookie = await signIn("pair@example.com");
    const page = await worker.fetch(started.verificationUrl, { headers: { Cookie: cookie } });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("Connect Browser Extension?");
    expect(html).not.toContain("dropimg_it_");

    const approve = await worker.fetch(
      `https://dropimg.io/connect/browser/${started.pairingId}/approve`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://dropimg.io" },
        redirect: "manual",
      },
    );
    expect(approve.status).toBe(303);

    const approved = await status(started.pairingId, started.deviceSecret);
    expect(approved.status).toBe(200);
    const once = (await approved.json()) as {
      status: string;
      token: string;
      user: { emailMasked: string };
      entitlements: { plan: string };
    };
    expect(once.status).toBe("approved");
    expect(once.token).toMatch(/^dropimg_it_/);
    expect(once.user.emailMasked).toContain("@example.com");
    expect(once.entitlements.plan).toBe("free");

    const consumed = await status(started.pairingId, started.deviceSecret);
    expect(await consumed.json()).toEqual({ status: "consumed" });
  });

  it("returns the pairing token to only one of two concurrent status calls", async () => {
    const started = await startPairing();
    const cookie = await signIn("race@example.com");
    const approve = await worker.fetch(
      `https://dropimg.io/connect/browser/${started.pairingId}/approve`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://dropimg.io" },
        redirect: "manual",
      },
    );
    expect(approve.status).toBe(303);

    const [a, b] = await Promise.all([
      status(started.pairingId, started.deviceSecret),
      status(started.pairingId, started.deviceSecret),
    ]);
    const bodies = (await Promise.all([a.json(), b.json()])) as Array<{
      status: string;
      token?: string;
    }>;
    const winners = bodies.filter((body) => body.status === "approved" && body.token);
    const losers = bodies.filter((body) => body.status === "consumed");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(winners[0]!.token).toMatch(/^dropimg_it_/);
  });

  it("does not leave a second live token if approve is submitted twice", async () => {
    const started = await startPairing();
    const cookie = await signIn("twice@example.com");
    for (let i = 0; i < 2; i++) {
      const approve = await worker.fetch(
        `https://dropimg.io/connect/browser/${started.pairingId}/approve`,
        {
          method: "POST",
          headers: { Cookie: cookie, Origin: "https://dropimg.io" },
          redirect: "manual",
        },
      );
      expect(approve.status).toBe(303);
    }
    const listed = await worker.fetch("https://dropimg.io/api/account/integrations", {
      headers: { Cookie: cookie },
    });
    const body = (await listed.json()) as { tokens: Array<{ kind: string }> };
    expect(body.tokens.filter((row) => row.kind === "extension")).toHaveLength(1);
  });

  it("rejects a wrong secret and cancelled or expired pairings", async () => {
    const started = await startPairing();
    const wrong = await status(started.pairingId, "not-the-secret");
    expect(wrong.status).toBe(401);

    const cookie = await signIn("cancel@example.com");
    const cancel = await worker.fetch(
      `https://dropimg.io/connect/browser/${started.pairingId}/cancel`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://dropimg.io" },
        redirect: "manual",
      },
    );
    expect(cancel.status).toBe(303);
    const cancelled = await status(started.pairingId, started.deviceSecret);
    expect(await cancelled.json()).toEqual({ status: "cancelled" });

    const env = await worker.getEnv();
    const other = await startPairing();
    await env.DB.prepare(`UPDATE browser_pairings SET expires_at = 1 WHERE id = ?`)
      .bind(other.pairingId)
      .run();
    const expired = await status(other.pairingId, other.deviceSecret);
    expect(await expired.json()).toEqual({ status: "expired" });
  });

  it("keeps manual integration tokens working after pairing exists", async () => {
    const cookie = await signIn("manual@example.com");
    const created = await worker.fetch("https://dropimg.io/api/account/integrations", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://dropimg.io",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label: "Chrome extension", kind: "extension" }),
    });
    expect(created.status).toBe(200);
    const body = (await created.json()) as { token: string };
    const me = await worker.fetch("https://dropimg.io/api/integrations/me", {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(me.status).toBe(200);
  });
});
