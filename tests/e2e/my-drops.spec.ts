import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const PNG_1x1 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x78, 0xda, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01,
  0x00, 0xf7, 0x03, 0x41, 0x43, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

test("signed-in upload appears on My drops", async ({ page, request }) => {
  const fixtureDir = join(process.cwd(), "tests/e2e/.fixtures");
  mkdirSync(fixtureDir, { recursive: true });
  const fixture = join(fixtureDir, "pixel.png");
  writeFileSync(fixture, PNG_1x1);

  const started = await request.post("/login", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: { email: `mydrops-${Date.now()}@example.com` },
  });
  expect(started.ok()).toBeTruthy();
  const body = (await started.json()) as { devMagicUrl?: string };
  await page.goto(
    new URL(body.devMagicUrl!).pathname + new URL(body.devMagicUrl!).search,
  );
  await expect(page.locator("#account-email-full")).toHaveText(/@example\.com$/);

  await page.locator("#file-input").setInputFiles(fixture);
  await expect(page.locator("#state-success")).toBeVisible({ timeout: 30_000 });
  const shareUrl = await page.locator("#share-url").inputValue();
  const slug = shareUrl.replace(/^https?:\/\/[^/]+\//, "");

  await page.locator("#account-app").click();
  await expect(page.locator("h1")).toContainText(/my drops/i);
  await expect(page.locator(".brand-logo").first()).toBeVisible();
  await expect(page.locator("footer.foot")).toBeVisible();
  const pageRoot = page.locator(".drops-page");
  await expect(pageRoot).toHaveAttribute("data-view", "grid");
  const urlInput = page.locator(`li[data-slug="${slug}"] .drop-url-input`);
  await expect(urlInput).toHaveValue(new RegExp(`/${slug}$`));
  await expect(page.locator(`img[src="/i/${slug}"]`)).toBeVisible();
  const copy = page.locator(`li[data-slug="${slug}"] button.drop-copy`);
  await expect(copy).toBeVisible();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await copy.click();
  await expect(copy).toHaveText(/copied/i);
  await page.locator('.drops-view-btn[data-view="list"]').click();
  await expect(pageRoot).toHaveAttribute("data-view", "list");
});
