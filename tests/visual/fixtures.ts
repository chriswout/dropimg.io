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

export const SCREEN_DIR = path.join(process.cwd(), "tests/visual/__screens__");

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

/** Signs in through the dev magic link so no mailbox is required. */
export async function signIn(
  page: Page,
  request: APIRequestContext,
  email = `visual-${Date.now()}@example.com`,
) {
  const started = await request.post("/login", {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
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
