import { test } from "@playwright/test";
import { asAnonymous, asPro, setTheme, shoot, type Theme } from "./fixtures";

const THEMES: Theme[] = ["light", "dark"];

test.describe("homepage", () => {
  for (const theme of THEMES) {
    test(`anonymous ${theme}`, async ({ page }, testInfo) => {
      await setTheme(page, theme);
      await asAnonymous(page);
      await page.goto("/");
      await shoot(page, `home-anon-${theme}-${testInfo.project.name}`);
    });

    test(`pro ${theme}`, async ({ page }, testInfo) => {
      await setTheme(page, theme);
      await asPro(page);
      await page.goto("/");
      await page.locator("#pro-options").waitFor({ state: "visible" });
      await shoot(page, `home-pro-${theme}-${testInfo.project.name}`);
    });
  }
});

test.describe("public pages", () => {
  for (const theme of THEMES) {
    test(`pro page ${theme}`, async ({ page }, testInfo) => {
      await setTheme(page, theme);
      await asAnonymous(page);
      await page.goto("/pro");
      await shoot(page, `pro-${theme}-${testInfo.project.name}`);
    });
  }

  test("browser extension light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await asAnonymous(page);
    await page.goto("/browser-extension");
    await shoot(page, `extension-light-${testInfo.project.name}`);
  });

  test("seo landing light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await asAnonymous(page);
    await page.goto("/temporary-image-hosting");
    await shoot(page, `landing-light-${testInfo.project.name}`);
  });

  test("legal light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await page.goto("/privacy.html");
    await shoot(page, `legal-light-${testInfo.project.name}`);
  });
});
