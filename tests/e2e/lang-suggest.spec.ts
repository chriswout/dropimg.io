import { expect, test } from "@playwright/test";

test.use({ locale: "es-ES" });

test("language suggest hides after switching back to English", async ({
  page,
}) => {
  await page.goto("/");
  const banner = page.locator("#lang-suggest");
  await expect(banner).toBeVisible();
  await expect(page.locator("#lang-suggest-msg")).toHaveText(
    /Prefieres verlo en español/i,
  );

  await page.locator("#lang-suggest-switch").click();
  await expect(page.locator('html[lang="es"]')).toHaveCount(1);

  await page.locator(".lang-summary").click();
  await page.locator(".lang-menu a[hreflang='en']").click();
  await expect(page.locator('html[lang="en"]')).toHaveCount(1);
  await expect(banner).toBeHidden();
  await expect(page.locator("#lang-suggest-msg")).toBeEmpty();
});

test("language suggest dismiss stays dismissed", async ({ page }) => {
  await page.goto("/");
  const banner = page.locator("#lang-suggest");
  await expect(banner).toBeVisible();

  await page.locator("#lang-suggest-dismiss").click();
  await expect(banner).toBeHidden();

  await page.reload();
  await expect(banner).toBeHidden();
});
