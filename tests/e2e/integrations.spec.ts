import { expect, test } from "@playwright/test";
import { postDevLogin } from "./dev-login";

test("account integrations create and revoke a token", async ({ page, request }) => {
  const { devMagicUrl } = await postDevLogin(request, `integ-${Date.now()}@example.com`);
  await page.goto(new URL(devMagicUrl).pathname + new URL(devMagicUrl).search);
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Integrations", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Connect DropIMG to tools you already use.")).toBeVisible();

  await page.locator("#integ-extension").click();
  const modal = page.locator("#token-modal");
  await expect(modal).toBeVisible();
  const token = page.locator("#token-value");
  await expect(token).toHaveValue(/^dropimg_it_/);
  await page.locator("#token-done").click();
  await expect(modal).toBeHidden();
  await expect(token).toHaveValue("");
  await expect(page.locator(".integ-row")).toContainText("Chrome extension");

  await page.locator(".integ-row .btn").click();
  await expect(page.locator("#revoke-modal")).toBeVisible();
  await page.locator("#revoke-ok").click();
  await expect(page.locator("#integ-list")).toContainText("No connected tools yet.");
});
