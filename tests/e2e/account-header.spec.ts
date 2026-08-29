import { expect, test } from "@playwright/test";

test("login page uses the same chrome as the homepage", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".brand-logo").first()).toBeVisible();
  await expect(page.locator("footer.foot")).toBeVisible();
  await expect(page.locator("#account-nav")).toBeVisible();
  await expect(page.locator(".lang")).toBeVisible();
  await expect(page.locator("#theme-toggle")).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
});

test("theme toggle switches light and dark", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toBeVisible();
  const before = await page.locator("html").getAttribute("data-theme");
  await toggle.click();
  const after = await page.locator("html").getAttribute("data-theme");
  expect(after).not.toBe(before);
  expect(after === "light" || after === "dark").toBeTruthy();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", after!);
});

test("homepage header shows Sign in, then email after magic link", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const signin = page.locator("#account-signin");
  await expect(signin).toBeVisible();
  await expect(signin).toHaveText(/sign in/i);

  const started = await request.post("/login", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: { email: `header-e2e-${Date.now()}@example.com` },
  });
  expect(started.ok()).toBeTruthy();
  const body = (await started.json()) as { devMagicUrl?: string };
  expect(body.devMagicUrl).toBeTruthy();

  await page.goto(new URL(body.devMagicUrl!).pathname + new URL(body.devMagicUrl!).search);
  await expect(page.locator("#account-app")).toBeVisible();
  await expect(page.locator("#account-plan")).toHaveText(/upgrade to pro/i);
  await expect(page.locator("#account-plan")).toHaveAttribute("href", "/pro");
  await expect(page.locator("#account-plan-badge")).toBeHidden();
  await expect(signin).toBeHidden();

  await page.locator(".account-summary").click();
  await expect(page.locator("#account-email-full")).toHaveText(/@example\.com$/);
  await expect(page.locator("#account-edit")).toHaveAttribute("href", "/account");
  await page.locator("#account-signout").click();
  await expect(signin).toBeVisible();
  await expect(page.locator("#account-session")).toBeHidden();
});
