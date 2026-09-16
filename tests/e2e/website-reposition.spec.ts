import { expect, test } from "@playwright/test";

test("homepage hero, nav, and dropzone stay usable on desktop", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /permanent web assets/i }),
  ).toBeVisible();
  await expect(page.locator(".product-nav")).toBeVisible();
  await expect(page.locator("#dropzone")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Drops vs Web Assets/i })).toBeVisible();
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
  await expect(page.locator("text=unlimited")).toHaveCount(0);

  await page.goto("/developers");
  await expect(page.getByRole("heading", { name: /Connect a coding agent/i })).toBeVisible();
  await expect(page.locator("code", { hasText: "https://dropimg.io/mcp" })).toBeVisible();
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
