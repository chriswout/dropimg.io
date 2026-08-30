import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Deterministic state helpers for visual QA.
 *
 * Everything here runs against the local dev worker with local D1. Pro state
 * is produced by stubbing the client-facing entitlements endpoint, never by
 * touching Paddle or by adding any server-side bypass. Nothing in this file is
 * imported by production code.
 */

/**
 * `__screens__` holds the approved reference captures and is committed. Normal
 * runs write to the ignored output directory instead, so iterating on the
 * design does not churn 6 MB of PNGs through git. Promote a run to the new
 * baseline deliberately with `VISUAL_UPDATE_REFERENCE=1`.
 */
export const REFERENCE_DIR = path.join(process.cwd(), "tests/visual/__screens__");
export const OUTPUT_DIR = path.join(process.cwd(), "tests/visual/.output/screens");

const SCREEN_DIR =
  process.env.VISUAL_UPDATE_REFERENCE === "1" ? REFERENCE_DIR : OUTPUT_DIR;

export type Theme = "light" | "dark";

export async function setTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("dropimg:theme", value as string);
    } catch {
      // first navigation may run before storage is available
    }
  }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
}

/**
 * Signs in through the dev magic link so no mailbox is required.
 *
 * The session is minted once per worker and replayed as cookies afterwards:
 * magic-link requests are rate limited to 5/minute per IP, which a full
 * screenshot run would otherwise blow through.
 */
/**
 * Every signed-in screenshot gets a brand-new account, so what it captures
 * depends only on what that test seeded.
 *
 * Magic links and uploads are rate limited per client IP over a rolling
 * window. Each sign-in claims its own synthetic IP and pins it on the browser
 * context, which keeps a full run (and repeat runs) clear of the limiter
 * without weakening anything server-side.
 */
let ipCounter = 0;

export async function signIn(page: Page, request: APIRequestContext) {
  const ip = `203.0.113.${(ipCounter++ % 250) + 2}`;
  const email = `visual-${Date.now()}-${ipCounter}@example.com`;
  await page.context().setExtraHTTPHeaders({ "CF-Connecting-IP": ip });

  const started = await request.post("/login", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip,
    },
    data: { email },
  });
  if (!started.ok()) throw new Error(`dev login failed: ${started.status()}`);
  const body = (await started.json()) as { devMagicUrl?: string };
  if (!body.devMagicUrl) throw new Error("dev login did not return a magic URL");
  const url = new URL(body.devMagicUrl);
  await page.goto(url.pathname + url.search);
  return email;
}

/**
 * Presents the UI as a Pro subscriber. This only rewrites the read-only
 * entitlements response the client uses to decide which controls to show.
 */
export async function asPro(page: Page, email = "alex.rivera@example.com") {
  await page.route("**/api/account/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "visual-pro", email },
        entitlements: {
          plan: "pro",
          maxUploadBytes: 25 * 1024 * 1024,
          allowedExpirySeconds: [86400, 604800, 2592000],
          passwordProtection: true,
        },
      }),
    });
  });
}

/** Presents the UI as a signed-out visitor. */
export async function asAnonymous(page: Page) {
  await page.route("**/api/account/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null }),
    });
  });
}

/**
 * Renders a fake app screenshot and uploads it, so share-page captures show a
 * realistic payload instead of a 1x1 pixel. Returns the slug.
 */
export async function seedSharedImage(
  page: Page,
  request: APIRequestContext,
): Promise<string> {
  const shot = await renderFakeScreenshot(page);
  const res = await request.post("/api/upload", {
    headers: { "Content-Type": "image/png" },
    data: shot,
  });
  if (!res.ok()) throw new Error(`fixture upload failed: ${res.status()}`);
  const body = (await res.json()) as { slug?: string };
  if (!body.slug) throw new Error("fixture upload returned no slug");
  return body.slug;
}

/**
 * Uploads screenshots owned by the currently signed-in session, so My drops
 * has rows. Uses `page.request` because that shares the page's session cookie.
 */
export async function seedOwnedDrops(
  page: Page,
  baseURL: string,
  count: number,
) {
  const shot = await renderFakeScreenshot(page);
  const origin = new URL(baseURL).origin;
  for (let i = 0; i < count; i++) {
    const intent = await page.request.post("/api/account/upload-intent", {
      headers: { "Content-Type": "application/json", Origin: origin },
      data: { expiry: 86400 },
    });
    if (!intent.ok()) throw new Error(`intent failed: ${intent.status()}`);
    const { uploadUrl } = (await intent.json()) as { uploadUrl: string };
    const up = await page.request.post(uploadUrl, {
      headers: { "Content-Type": "image/png", Origin: origin },
      data: shot,
    });
    if (!up.ok()) throw new Error(`owned upload failed: ${up.status()}`);
  }
}

/**
 * Renders a server view function straight into the page. Used for states that
 * would otherwise need privileged data (a Pro-owned password-protected image),
 * so QA never needs a backdoor route to reach them.
 */
export async function renderServerView(page: Page, baseURL: string, html: string) {
  const withBase = html.replace(
    "<head>",
    `<head><base href="${new URL(baseURL).origin}/">`,
  );
  await page.setContent(withBase, { waitUntil: "load" });
}

export async function renderFakeScreenshot(page: Page): Promise<Buffer> {
  const scratch = await page.context().newPage();
  await scratch.setViewportSize({ width: 1200, height: 760 });
  await scratch.setContent(`<!DOCTYPE html>
<html><body style="margin:0;font:16px ui-sans-serif,system-ui,sans-serif;
  background:#0f172a;color:#e2e8f0;height:100vh;display:grid;
  grid-template-rows:44px 1fr">
  <div style="display:flex;align-items:center;gap:8px;padding:0 14px;
    background:#111c33;border-bottom:1px solid #1f2b45">
    <span style="width:11px;height:11px;border-radius:50%;background:#ef4444"></span>
    <span style="width:11px;height:11px;border-radius:50%;background:#f59e0b"></span>
    <span style="width:11px;height:11px;border-radius:50%;background:#22c55e"></span>
    <span style="margin-left:12px;color:#7f8ea8;font-size:13px">build.log</span>
  </div>
  <pre style="margin:0;padding:20px 24px;line-height:1.7;font:14px ui-monospace,monospace">
<span style="color:#38bdf8">$</span> npm run build

  vite v7.1.4 building for production...
  <span style="color:#4ade80">✓</span> 148 modules transformed
  <span style="color:#4ade80">✓</span> built in 151ms

<span style="color:#38bdf8">$</span> npm test

  <span style="color:#4ade80">✓</span> tests/unit/entitlements.test.ts   (9 tests)
  <span style="color:#4ade80">✓</span> tests/unit/i18n-v2.test.ts        (3 tests)
  <span style="color:#f87171">✗</span> tests/unit/pricing.test.ts        (1 failed)

    expected 1999 to be 1990
      at pricing.test.ts:42:18
  </pre>
</body></html>`);
  const buffer = await scratch.screenshot({ type: "png" });
  await scratch.close();
  return buffer;
}

/** Waits for fonts, images and the account nav to settle before capturing. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
}

export async function shoot(page: Page, name: string) {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  await settle(page);
  await page.screenshot({
    path: path.join(SCREEN_DIR, `${name}.png`),
    fullPage: true,
  });
}
