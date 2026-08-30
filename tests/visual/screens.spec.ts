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
