/**
 * Public Web Asset delivery meter.
 *
 * Counted: successful GET /m/… that returns 200 (bytes actually requested).
 * Not counted: HEAD, 304, OPTIONS, dashboard HTML, REST, MCP, metadata.
 *
 * Reset: calendar month UTC for Free, Developer, and Pro.
 *
 * Architecture: Analytics Engine for observability + one waitUntil D1 UPSERT
 * on the monthly row. The response is never blocked on the write. Serving
 * never returns 402/404 for delivery overage. Crossing 100% starts a 3-day
 * grace window for the dashboard; the next calendar month resets the counter.
 */

import { track } from "./analytics";
import type { BillingEnv } from "./billing/types";
import { loadLiveOrg } from "./tenancy";
import { webAssetsEntitlementsForOrg } from "./web-assets-entitlements";
import {
  calendarMonthUtc,
  WEB_ASSETS_DELIVERY_GRACE_SECONDS,
  WEB_ASSETS_DELIVERY_WARN_RATIO,
} from "./web-assets-plans";

export async function recordSuccessfulAssetGet(
  env: Cloudflare.Env & BillingEnv,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  orgId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  track(env.ANALYTICS, "media_asset_delivered", { client: "web" });
  ctx.waitUntil(
    meterDelivery(env, orgId, now).catch(() => {
      // Metering must never fail a live asset response.
    }),
  );
}

export async function meterDelivery(
  env: Cloudflare.Env & BillingEnv,
  orgId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<{ count: number; period: string }> {
  const period = calendarMonthUtc(now * 1000);
  const row = await env.DB.prepare(
    `INSERT INTO media_delivery_months (org_id, period, count, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(org_id, period) DO UPDATE SET
       count = count + 1,
       updated_at = excluded.updated_at
     RETURNING count, warned_at, over_at, grace_until`,
  )
    .bind(orgId, period, now)
    .first<{
      count: number;
      warned_at: number | null;
      over_at: number | null;
      grace_until: number | null;
    }>();

  const count = Number(row?.count ?? 1);
  const org = await loadLiveOrg(env.DB, orgId);
  if (!org) return { count, period };
  const { config } = await webAssetsEntitlementsForOrg(env, org);
  const limit = config.deliveryLimitMonthly;
  const warnAt = Math.floor(limit * WEB_ASSETS_DELIVERY_WARN_RATIO);

  if (count >= warnAt && row?.warned_at == null) {
    await env.DB.prepare(
      `UPDATE media_delivery_months SET warned_at = ? WHERE org_id = ? AND period = ? AND warned_at IS NULL`,
    )
      .bind(now, orgId, period)
      .run();
    track(env.ANALYTICS, "web_assets_quota_warning", { reason: "deliveries", plan: config.id });
  }

  if (count >= limit && row?.over_at == null) {
    const graceUntil = now + WEB_ASSETS_DELIVERY_GRACE_SECONDS;
    await env.DB.prepare(
      `UPDATE media_delivery_months
       SET over_at = ?, grace_until = COALESCE(grace_until, ?)
       WHERE org_id = ? AND period = ? AND over_at IS NULL`,
    )
      .bind(now, graceUntil, orgId, period)
      .run();
    track(env.ANALYTICS, "web_assets_quota_blocked", { reason: "deliveries", plan: config.id });
  }

  return { count, period };
}
