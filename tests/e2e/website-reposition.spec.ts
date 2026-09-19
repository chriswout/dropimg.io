import { expect, test } from "@playwright/test";

test("homepage hero, nav, and dropzone stay usable on desktop", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#hero-heading")).toBeVisible();
  await expect(page.locator(".product-nav")).toBeVisible();
  await expect(page.locator(".product-nav")).not.toContainText("Pro · €2.99");
  await expect(page.locator(".product-nav")).not.toContainText("€2.99");
  await expect(page.locator("#dropzone")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Drops vs Web Assets/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Give your coding agent permanent web assets/i }),
  ).toBeVisible();
  await expect(page.getByText("Version 12 · AVIF")).toBeVisible();
  await expect(page.getByText("Version 13 · WebP")).toBeVisible();
  await expect(page.getByText("/m/acme/site/homepage/hero").first()).toBeVisible();
  await expect(page.getByText("hero-v1.avif")).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});

test("pricing and web-assets pages render launch-safe CTAs", async ({ page }) => {
  await page.goto("/web-assets");
  await expect(
    page.getByRole("heading", { name: /Permanent web assets for applications/i }),
  ).toBeVisible();
  await expect(page.getByText("PDF, video, audio")).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
  await expect(page.locator(".price-card[data-tier='developer'] .price-amount:not([hidden])")).toHaveText(/\$9/);
  await expect(page.locator(".price-card[data-tier='pro'] .price-amount:not([hidden])")).toHaveText(/\$29/);
  await expect(page.getByRole("heading", { name: /Need temporary image sharing instead/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Drops Pro" }).first()).toBeVisible();
  await expect(page.getByText(/€2\.99/).first()).toBeVisible();
  await expect(page.locator("text=unlimited")).toHaveCount(0);
  await expect(page.locator('[data-wa-checkout="developer"]')).toHaveAttribute("data-interval", "monthly");
  await page.locator('[data-select-interval="annual"]').click();
  await expect(page.locator(".price-card[data-tier='developer'] .price-amount:not([hidden])")).toHaveText(/\$7\.50/);
  await expect(page.locator(".price-card[data-tier='pro'] .price-amount:not([hidden])")).toHaveText(/\$24\.17/);
  await expect(page.locator('[data-wa-checkout="developer"]')).toHaveAttribute("data-interval", "annual");
  await expect(page.locator('[data-wa-checkout="pro"]')).toHaveAttribute("data-interval", "annual");

  await page.goto("/developers");
  await expect(page.getByRole("heading", { name: /Web assets your coding agent can manage/i })).toBeVisible();
  await expect(page.locator("code", { hasText: "https://dropimg.io/mcp" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Authentication" })).toBeVisible();
  await expect(page.locator(".docs-auth-card").getByText("dropimg_api_")).toBeVisible();
  await expect(page.locator(".docs-auth-card").getByText("dropimg_pk_")).toBeVisible();
  await expect(page.getByRole("button", { name: "Web Assets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Drops" })).toBeVisible();
  await expect(page.locator(".code-box").first()).toBeVisible();

  await page.goto("/mcp");
  await expect(
    page.getByRole("heading", { name: /Give your coding agent stable web assets/i }),
  ).toBeVisible();
  await expect(page.getByText("Temporary Drops are available from the same MCP server.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ask your agent for a temporary image URL/i })).toHaveCount(0);
});

for (const width of [390, 768, 1280] as const) {
  test(`homepage does not overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.locator("#dropzone")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });
}

for (const width of [320, 390, 768, 1280, 1440] as const) {
  test(`pricing page does not overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing");
    await expect(page.locator("#plans")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
    const chip = page.locator(".account-get-started");
    await expect(chip).toBeVisible();
    const box = await chip.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThan(48);
  });
}
