import { expect, test } from "@playwright/test";

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440] as const;

const PAGES = [
  "/",
  "/de",
  "/pro",
  "/de/pro",
  "/login",
  "/image-to-url",
  "/es/imagen-a-url",
  "/pt-br/imagem-para-url",
  "/screenshot-to-link",
  "/es/captura-de-pantalla-a-enlace",
  "/pt-br/colar-print-online",
] as const;

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

for (const width of WIDTHS) {
  test(`public pages fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator(".brand-logo").first()).toBeVisible();
      await expect(page.locator("#theme-toggle")).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });
}

/**
 * A long address must truncate inside the account chip rather than push the
 * header past the viewport.
 */
test("a long signed-in email never widens the header", async ({ page }) => {
  await page.route("**/api/account/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "wide", email: "an.extremely.long.address@a-very-long-domain.example" },
        entitlements: {
          plan: "pro",
          maxUploadBytes: 52_428_800,
          allowedExpirySeconds: [3600, 86_400, 604_800, 2_592_000, 7_776_000],
          defaultExpirySeconds: 604_800,
          passwordProtection: true,
        },
      }),
    });
  });

  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    await expect(page.locator("#account-email")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});

test("signed-in app and account fit 390px", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const started = await request.post("/login", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: { email: `responsive-${Date.now()}@example.com` },
  });
  expect(started.ok()).toBeTruthy();
  const body = (await started.json()) as { devMagicUrl?: string };
  await page.goto(
    new URL(body.devMagicUrl!).pathname + new URL(body.devMagicUrl!).search,
  );
  for (const path of ["/app", "/app/integrations", "/app/billing"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
  await page.goto("/app/account");
  await expect(page.getByRole("heading", { name: "Account" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
  await page.locator("#account-delete").click();
  await expect(page.locator("#delete-modal")).toBeVisible();
  await expect(page.getByText("This cannot be undone.")).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
