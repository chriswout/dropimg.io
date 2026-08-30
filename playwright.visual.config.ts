import { defineConfig, devices } from "@playwright/test";

/**
 * Visual QA only. Captures full-page screenshots of the redesign at the two
 * reference widths. Kept separate from `playwright.config.ts` so the
 * functional e2e gate stays fast and free of image artifacts.
 *
 * `npm run visual` writes to the ignored `tests/visual/.output/screens`.
 * `npm run visual:approve` overwrites the committed reference set in
 * `tests/visual/__screens__` — only do that at an approved checkpoint.
 */

const port = Number(process.env.E2E_PORT || 8788);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/visual",
  // Playwright wipes `outputDir` at the start of every run, so the captures
  // live in a sibling directory under the same ignored parent.
  outputDir: "tests/visual/.output/playwright",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    // Freeze the rendering surface so repeat runs are comparable.
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 2,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Runs the staging environment so QA sees the V2 lifecycle the design
        // is for. Production keeps those flags off; the functional e2e gate
        // still runs against the default, flag-off environment.
        command: `npm run generate:pages && npm run generate:site-assets && npx wrangler d1 migrations apply dropimg --local && CLOUDFLARE_ENV=staging npx vite --host 127.0.0.1 --port ${port}`,
        url: `${baseURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
