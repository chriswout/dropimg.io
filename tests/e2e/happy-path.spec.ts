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

test("homepage upload happy path", async ({ page }) => {
  const fixtureDir = join(process.cwd(), "tests/e2e/.fixtures");
  mkdirSync(fixtureDir, { recursive: true });
  const fixture = join(fixtureDir, "pixel.png");
  writeFileSync(fixture, PNG_1x1);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Drop an image/i })).toBeVisible();

  await page.locator("#file-input").setInputFiles(fixture);

  await expect(page.locator("#state-success")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#share-url")).toHaveValue(/[^/\s]+\/[A-Za-z0-9]{8}$/);

  const displayed = await page.locator("#share-url").inputValue();
  const shareUrl =
    (await page.locator("#share-url").getAttribute("data-url")) ||
    `${new URL(page.url()).protocol}//${displayed}`;
  const share = await page.request.get(shareUrl);
  expect(share.status()).toBe(200);
  expect(await share.text()).toContain("Shared image");
});
