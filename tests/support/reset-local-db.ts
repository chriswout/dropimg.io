import { execFileSync } from "node:child_process";

/**
 * Local runs share one loopback IP and one persisted D1 file, so magic links
 * and uploads accumulate until the auth and daily-quota limiters reject the
 * suites. Clearing the ledgers keeps repeat runs deterministic; the tables
 * only ever hold data these suites created.
 */
const TABLES = ["reports", "images", "upload_intents", "magic_links"];

export function resetLocalDb(): void {
  if (process.env.E2E_BASE_URL) return;
  try {
    execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "dropimg",
        "--local",
        "--command",
        TABLES.map((t) => `DELETE FROM ${t};`).join(" "),
      ],
      { stdio: "ignore" },
    );
  } catch {
    // No local database yet: the web server applies migrations on start.
  }
}
