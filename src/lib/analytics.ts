export type AnalyticsEvent =
  | "upload_ok"
  | "upload_fail"
  | "upload_start"
  | "share_view"
  | "delete_user"
  | "delete_expired"
  | "delete_moderation"
  | "rate_limited"
  | "home_view"
  | "landing_view"
  | "share_cta_click"
  | "recent_link_open"
  | "recent_delete"
  | "auth_requested"
  | "auth_completed"
  | "claim_ok"
  | "unlock_ok"
  | "unlock_fail"
  | "extend_ok"
  | "password_set"
  | "password_protection_used"
  | "checkout_started"
  | "checkout_completed_client"
  | "billing_webhook_ok"
  | "account_deleted"
  | "integration_token_created"
  | "integration_token_revoked"
  | "integration_connected_extension"
  | "integration_upload_ok"
  | "pro_page_view"
  | "pro_cta_click"
  | "pro_activated"
  | "pro_canceled"
  | "dashboard_open"
  | "dashboard_copy"
  | "dashboard_delete";

export const ANALYTICS_PLANS = ["anonymous", "free", "pro"] as const;
export const ANALYTICS_INTERVALS = ["monthly", "annual"] as const;
export const ANALYTICS_CLIENTS = [
  "web",
  "extension",
  "chrome-extension",
  "edge-extension",
  "sharex",
  "other",
] as const;

export type AnalyticsPlan = (typeof ANALYTICS_PLANS)[number];
export type AnalyticsInterval = (typeof ANALYTICS_INTERVALS)[number];

const PLAN_SET = new Set<string>(ANALYTICS_PLANS);
const INTERVAL_SET = new Set<string>(ANALYTICS_INTERVALS);

export const SENSITIVE_ANALYTICS_KEYS = [
  "email",
  "user_id",
  "userId",
  "token",
  "token_id",
  "tokenId",
  "password",
  "label",
  "ip",
] as const;

export function allowPlan(raw: string | null | undefined): AnalyticsPlan | "" {
  const v = (raw || "").trim().toLowerCase();
  return PLAN_SET.has(v) ? (v as AnalyticsPlan) : "";
}

export function allowInterval(
  raw: string | null | undefined,
): AnalyticsInterval | "" {
  const v = (raw || "").trim().toLowerCase();
  return INTERVAL_SET.has(v) ? (v as AnalyticsInterval) : "";
}

export function track(
  analytics: AnalyticsEngineDataset | undefined,
  event: AnalyticsEvent,
  opts: {
    slug?: string;
    mime?: string;
    reason?: string;
    size?: number;
    /** Upload surface: web | chrome-extension | edge-extension | sharex | … */
    client?: string;
    /** Strict page / SEO intent ID (never a URL). */
    pageIntent?: string;
    plan?: string;
    interval?: string;
  } = {},
): void {
  if (!analytics) return;
  try {
    analytics.writeDataPoint({
      indexes: [event],
      blobs: [
        opts.slug ?? "",
        opts.mime ?? "",
        opts.reason ?? "",
        opts.client ?? "",
        opts.pageIntent ?? "",
        allowPlan(opts.plan),
        allowInterval(opts.interval),
      ],
      doubles: [opts.size ?? 0],
    });
  } catch {
    // Never fail a request because of analytics
  }
}
