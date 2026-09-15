import { defineConfig, devices } from "@playwright/test";
import { CONSENT_STATE_PATH } from "./tests/e2e/consent-state";
import { localViteWebServerEnv } from "./tests/support/local-vite-env";

const port = Number(process.env.E2E_PORT || 8788);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    // Written by global setup; carries only the analytics decline.
    storageState: CONSENT_STATE_PATH,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_ENV CLOUDFLARE_VITE_REMOTE_BINDINGS=false bash -c 'npm run generate:pages && npx wrangler d1 migrations apply dropimg --local && npx vite --host 127.0.0.1 --port ${port}'`,
        url: `${baseURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: localViteWebServerEnv(),
      },
});
