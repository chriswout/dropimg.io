import { join } from "node:path";

export const CONSENT_STATE_PATH = join(
  process.cwd(),
  "tests/e2e/.output/consent-state.json",
);

export function e2eBaseUrl(): string {
  return (
    process.env.E2E_BASE_URL ||
    `http://127.0.0.1:${Number(process.env.E2E_PORT || 8788)}`
  );
}

/**
 * A storage state carrying nothing but the analytics decline, so specs start
 * with the prompt already answered and no cookies or session presumed.
 */
export function consentStorageState() {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(e2eBaseUrl()).origin,
        localStorage: [{ name: "dropimg:analytics", value: "denied" }],
      },
    ],
  };
}
