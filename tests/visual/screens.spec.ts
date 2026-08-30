import { test } from "@playwright/test";
import { renderLockedSharePage } from "../../src/views/locked-share";
import { renderLoginPage } from "../../src/views/login";
import { renderGonePage } from "../../src/views/share";
import {
  asAnonymous,
  asPro,
  renderFakeScreenshot,
  renderServerView,
  seedOwnedDrops,
  seedSharedImage,
  setTheme,
  shoot,
  signIn,
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
      await page.locator("#pro-password-wrap").waitFor({ state: "visible" });
      await shoot(page, `home-pro-${theme}-${testInfo.project.name}`);
    });
  }

  /** Drives the real `dragenter` handler rather than toggling classes. */
  test("dragover light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await asAnonymous(page);
    await page.goto("/");
    await page.evaluate(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["x"], "shot.png", { type: "image/png" }));
      window.dispatchEvent(
        new DragEvent("dragenter", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    });
    await page.locator("#dropzone.dragover").waitFor();
    await shoot(page, `home-dragover-light-${testInfo.project.name}`);
  });

  test("success light", async ({ page }, testInfo) => {
    await setTheme(page, "light");
    await asAnonymous(page);
    await page.goto("/");
    await page.setInputFiles("#file-input", {
      name: "shot.png",
      mimeType: "image/png",
      buffer: await renderFakeScreenshot(page),
    });
    await page.locator("#state-success").waitFor({ state: "visible" });
    await shoot(page, `home-success-light-${testInfo.project.name}`);
  });
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

test.describe("sign in", () => {
  for (const theme of THEMES) {
    test(`form ${theme}`, async ({ page }, testInfo) => {
      await setTheme(page, theme);
      await asAnonymous(page);
      await page.goto("/login");
      await shoot(page, `login-${theme}-${testInfo.project.name}`);
    });
  }

  /** The state a real visitor lands on straight after asking for a link. */
  test("link sent light", async ({ page, baseURL }, testInfo) => {
    await setTheme(page, "light");
    await renderServerView(
      page,
      baseURL!,
      renderLoginPage({
        locale: "en",
        env: {},
        state: "sent",
        email: "alex.rivera@example.com",
        maskedEmail: "a***@example.com",
      }),
    );
    await shoot(page, `login-sent-light-${testInfo.project.name}`);
  });

  /** No form to show, so this state has to hold the card on its own. */
  test("rate limited light", async ({ page, baseURL }, testInfo) => {
    await setTheme(page, "light");
    await renderServerView(
      page,
      baseURL!,
      renderLoginPage({ locale: "en", env: {}, state: "rate_limited" }),
    );
    await shoot(page, `login-limited-light-${testInfo.project.name}`);
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

test.describe("signed-in app", () => {
  for (const theme of THEMES) {
    test(`my drops ${theme}`, async ({ page, request, baseURL }, testInfo) => {
      await setTheme(page, theme);
      await signIn(page, request);
      await seedOwnedDrops(page, baseURL!, 3);
      await page.goto("/app");
      await shoot(page, `app-drops-${theme}-${testInfo.project.name}`);
    });
  }

  test("my drops empty light", async ({ page, request }, testInfo) => {
    await setTheme(page, "light");
    await signIn(page, request);
    await page.goto("/app");
    await shoot(page, `app-drops-empty-light-${testInfo.project.name}`);
  });

  test("integrations light", async ({ page, request }, testInfo) => {
    await setTheme(page, "light");
    await signIn(page, request);
    await page.goto("/app/integrations");
    await shoot(page, `app-integrations-light-${testInfo.project.name}`);
  });

  test("billing light", async ({ page, request }, testInfo) => {
    await setTheme(page, "light");
    await signIn(page, request);
    await page.goto("/app/billing");
    await shoot(page, `app-billing-light-${testInfo.project.name}`);
  });

  test("account dark", async ({ page, request }, testInfo) => {
    await setTheme(page, "dark");
    await signIn(page, request);
    await page.goto("/app/account");
    await shoot(page, `app-account-dark-${testInfo.project.name}`);
  });
});
