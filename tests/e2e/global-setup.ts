import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { resetLocalDb } from "../support/reset-local-db";
import { CONSENT_STATE_PATH, consentStorageState } from "./consent-state";

export default function globalSetup() {
  resetLocalDb();

  /**
   * Pre-answer the analytics prompt for every spec. Left unanswered, the
   * banner is fixed to the bottom of the viewport and intercepts clicks on
   * anything near it, which turns a consent change into unrelated test
   * failures. Declining also keeps runs from ever reaching Google.
   */
  mkdirSync(dirname(CONSENT_STATE_PATH), { recursive: true });
  writeFileSync(
    CONSENT_STATE_PATH,
    JSON.stringify(consentStorageState(), null, 2),
    "utf8",
  );
}
