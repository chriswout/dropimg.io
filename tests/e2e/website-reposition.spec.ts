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
  await expect(page.locator(".price-card[data-tier='developer'] .price-amount")).toHaveText(/\$9/);
  await expect(page.locator(".price-card[data-tier='pro'] .price-amount")).toHaveText(/\$29/);
  await expect(page.getByRole("heading", { name: /Looking for Drops pricing/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Drops Pro" }).first()).toBeVisible();
  await expect(page.getByText(/€2\.99\/month/).first()).toBeVisible();
  await expect(page.locator("text=unlimited")).toHaveCount(0);

  await page.goto("/developers");
  await expect(page.getByRole("heading", { name: /Web assets your coding agent can manage/i })).toBeVisible();
  await expect(page.locator("code", { hasText: "https://dropimg.io/mcp" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Authentication" })).toBeVisible();
  await expect(page.locator(".docs-auth-card").getByText("dropimg_api_")).toBeVisible();
  await expect(page.locator(".docs-auth-card").getByText("dropimg_pk_")).toBeVisible();
  await expect(page.getByRole("button", { name: "Web Assets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Drops" })).toBeVisible();
  await expect(page.locator(".code-box").first()).toBeVisible();
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
