import { test } from "@playwright/test";
import { renderLockedSharePage } from "../../src/views/locked-share";
import { renderGonePage } from "../../src/views/share";
import {
  asAnonymous,
  asPro,
  renderServerView,
  seedSharedImage,
  setTheme,
  shoot,
  type Theme,
} from "./fixtures";

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

test.describe("share experience", () => {
  for (const theme of THEMES) {
    test(`share page ${theme}`, async ({ page, request }, testInfo) => {
      await setTheme(page, theme);
      const slug = await seedSharedImage(page, request);
      await page.goto(`/${slug}`);
      await shoot(page, `share-${theme}-${testInfo.project.name}`);
    });
  }

  test("expired light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await page.goto("/zzzzzzzz");
    await shoot(page, `share-missing-light-${testInfo.project.name}`);
  });

  test("deleted dark", async ({ page, baseURL }, testInfo) => {
    await setTheme(page, "dark");
    await renderServerView(
      page,
      baseURL!,
      renderGonePage({ reason: "deleted", locale: "en" }),
    );
    await shoot(page, `share-deleted-dark-${testInfo.project.name}`);
  });

  test("protected light", async ({ page, baseURL }, testInfo) => {
    await setTheme(page, "light");
    await renderServerView(
      page,
      baseURL!,
      renderLockedSharePage({ slug: "Ab3xK9mQ", origin: baseURL!, locale: "en" }),
    );
    await shoot(page, `share-locked-light-${testInfo.project.name}`);
  });

  test("not found light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await page.goto("/404.html");
    await shoot(page, `notfound-light-${testInfo.project.name}`);
  });
});
