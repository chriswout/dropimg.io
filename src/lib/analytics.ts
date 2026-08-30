export type AnalyticsEvent =
  | "upload_ok"
  | "upload_fail"
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
  | "checkout_started"
  | "billing_webhook_ok"
  | "account_deleted"
  | "integration_token_created"
  | "integration_token_revoked"
  | "integration_connected_extension"
  | "integration_upload_ok";

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
      ],
      doubles: [opts.size ?? 0],
    });
  } catch {
    // Never fail a request because of analytics
  }
}
