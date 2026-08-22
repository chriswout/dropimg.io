export type AnalyticsEvent =
  | "upload_ok"
  | "upload_fail"
  | "share_view"
  | "delete_user"
  | "delete_expired"
  | "rate_limited";

export function track(
  analytics: AnalyticsEngineDataset | undefined,
  event: AnalyticsEvent,
  opts: {
    slug?: string;
    mime?: string;
    reason?: string;
    size?: number;
  } = {},
): void {
  if (!analytics) return;
  try {
    analytics.writeDataPoint({
      indexes: [event],
      blobs: [opts.slug ?? "", opts.mime ?? "", opts.reason ?? ""],
      doubles: [opts.size ?? 0],
    });
  } catch {
    // Never fail a request because of analytics
  }
}
