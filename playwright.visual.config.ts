import { defineConfig, devices } from "@playwright/test";

/**
 * Visual QA only. Captures full-page screenshots of the redesign at the two
 * reference widths. Kept separate from `playwright.config.ts` so the
 * functional e2e gate stays fast and free of image artifacts.
 */

const port = Number(process.env.E2E_PORT || 8788);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/visual",
  outputDir: "tests/visual/.output",
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
        command: `npm run generate:pages && npm run generate:site-assets && npx wrangler d1 migrations apply dropimg --local && npx vite --host 127.0.0.1 --port ${port}`,
        url: `${baseURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
