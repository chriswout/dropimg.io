import type { Plan } from "./entitlements";
import { QUOTA_WINDOW_SECONDS } from "../types";

export const PROGRAMMATIC_SOURCES = ["api", "mcp"] as const;

export const FREE_PROGRAMMATIC_DAILY_UPLOADS = 20;
export const FREE_PROGRAMMATIC_DAILY_BYTES = 50 * 1024 * 1024;
export const PRO_PROGRAMMATIC_DAILY_UPLOADS = 100;
export const PRO_PROGRAMMATIC_DAILY_BYTES = 500 * 1024 * 1024;

export function isProgrammaticSource(source: string): boolean {
  return source === "api" || source === "mcp";
}

export function programmaticDailyLimits(plan: Plan): {
  uploads: number;
  bytes: number;
} {
  if (plan === "pro") {
    return {
      uploads: PRO_PROGRAMMATIC_DAILY_UPLOADS,
      bytes: PRO_PROGRAMMATIC_DAILY_BYTES,
    };
  }
  return {
    uploads: FREE_PROGRAMMATIC_DAILY_UPLOADS,
    bytes: FREE_PROGRAMMATIC_DAILY_BYTES,
  };
}

export function programmaticQuotaMessage(plan: Plan): string {
  if (plan === "pro") {
    return "Pro API/MCP daily limit reached (100/day). Try again tomorrow.";
  }
  return "Free API/MCP limit reached (20/day). Upgrade to Pro for 100/day.";
}

/**
 * Shared API+MCP rolling 24h bucket. Web / extension / ShareX do not count.
 * The global 100/500 ceiling in overDailyQuota still applies to every source.
 */
export async function overProgrammaticDailyQuota(
  db: D1Database,
  opts: { userId: string; plan: Plan; now?: number },
): Promise<boolean> {
  const limits = programmaticDailyLimits(opts.plan);
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const since = now - QUOTA_WINDOW_SECONDS;
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(size), 0) as bytes
       FROM images
       WHERE user_id = ? AND source IN ('api', 'mcp') AND created_at >= ?`,
    )
    .bind(opts.userId, since)
    .first<{ cnt: number; bytes: number }>();
  if (!row) return false;
  return row.cnt >= limits.uploads || row.bytes >= limits.bytes;
}
