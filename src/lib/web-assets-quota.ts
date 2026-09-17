import { track } from "./analytics";
import type { BillingEnv } from "./billing/types";
import { loadLiveOrg } from "./tenancy";
import { webAssetsEntitlementsForOrg } from "./web-assets-entitlements";
import { calendarMonthUtc, type WebAssetsPlanConfig } from "./web-assets-plans";

export type QuotaBlockReason = "projects" | "storage" | "keys";

export type QuotaFail = {
  ok: false;
  status: 403 | 413;
  code: "quota_exceeded";
  error: string;
  reason: QuotaBlockReason;
};

export type WebAssetsUsage = {
  plan: WebAssetsPlanConfig["id"];
  interval: "monthly" | "annual" | null;
  status: string | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  projects: { used: number; limit: number };
  storage: { used: number; limit: number };
  deliveries: {
    used: number;
    limit: number;
    period: string;
    warned: boolean;
    over: boolean;
    graceUntil: number | null;
  };
  keys: { used: number; limit: number };
};

function blocked(reason: QuotaBlockReason, error: string, status: 403 | 413 = 403): QuotaFail {
  return { ok: false, status, code: "quota_exceeded", error, reason };
}

export async function countLiveProjects(db: D1Database, orgId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM projects WHERE org_id = ? AND deleted_at IS NULL`,
    )
    .bind(orgId)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function orgStorageBytesUsed(db: D1Database, orgId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(delta), 0) AS bytes
       FROM usage_events
       WHERE org_id = ? AND meter = 'storage_original_bytes'`,
    )
    .bind(orgId)
    .first<{ bytes: number }>();
  return Number(row?.bytes ?? 0);
}

export async function countActiveProjectKeys(
  db: D1Database,
  orgId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM project_credentials
       WHERE org_id = ?
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > ?)`,
    )
    .bind(orgId, now)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function loadDeliveryMonth(
  db: D1Database,
  orgId: string,
  period: string,
): Promise<{
  count: number;
  warnedAt: number | null;
  overAt: number | null;
  graceUntil: number | null;
}> {
  const row = await db
    .prepare(
      `SELECT count, warned_at, over_at, grace_until
       FROM media_delivery_months
       WHERE org_id = ? AND period = ?
       LIMIT 1`,
    )
    .bind(orgId, period)
    .first<{
      count: number;
      warned_at: number | null;
      over_at: number | null;
      grace_until: number | null;
    }>();
  return {
    count: Number(row?.count ?? 0),
    warnedAt: row?.warned_at ?? null,
    overAt: row?.over_at ?? null,
    graceUntil: row?.grace_until ?? null,
  };
}

export function assertStorageFits(
  used: number,
  incoming: number,
  limit: number,
): QuotaFail | { ok: true } {
  if (used + incoming > limit) {
    return blocked("storage", "Web Asset storage quota exceeded", 413);
  }
  return { ok: true };
}

export async function assertCanCreateProject(
  env: Cloudflare.Env & BillingEnv,
  orgId: string,
): Promise<QuotaFail | { ok: true }> {
  const org = await loadLiveOrg(env.DB, orgId);
  if (!org) return blocked("projects", "Not found");
  const entitlements = await webAssetsEntitlementsForOrg(env, org);
  const used = await countLiveProjects(env.DB, orgId);
  if (used >= entitlements.config.projectLimit) {
    trackQuotaBlocked(env, "projects");
    return blocked(
      "projects",
      `Plan allows ${entitlements.config.projectLimit} projects`,
    );
  }
  return { ok: true };
}

export async function assertCanCreateProjectKey(
  env: Cloudflare.Env & BillingEnv,
  orgId: string,
): Promise<QuotaFail | { ok: true }> {
  const org = await loadLiveOrg(env.DB, orgId);
  if (!org) return blocked("keys", "Not found");
  const entitlements = await webAssetsEntitlementsForOrg(env, org);
  const used = await countActiveProjectKeys(env.DB, orgId);
  if (used >= entitlements.config.projectKeyLimit) {
    trackQuotaBlocked(env, "keys");
    return blocked(
      "keys",
      `Plan allows ${entitlements.config.projectKeyLimit} active project keys`,
    );
  }
  return { ok: true };
}

export async function assertCanStoreBytes(
  env: Cloudflare.Env & BillingEnv,
  orgId: string,
  incoming: number,
): Promise<QuotaFail | { ok: true }> {
  const org = await loadLiveOrg(env.DB, orgId);
  if (!org) return blocked("storage", "Not found", 413);
  const entitlements = await webAssetsEntitlementsForOrg(env, org);
  const used = await orgStorageBytesUsed(env.DB, orgId);
  const fits = assertStorageFits(used, incoming, entitlements.config.storageBytesLimit);
  if (!fits.ok) trackQuotaBlocked(env, "storage");
  return fits;
}

export async function loadWebAssetsUsage(
  env: Cloudflare.Env & BillingEnv,
  orgId: string,
  now = Math.floor(Date.now() / 1000),
): Promise<WebAssetsUsage | null> {
  const org = await loadLiveOrg(env.DB, orgId);
  if (!org) return null;
  const entitlements = await webAssetsEntitlementsForOrg(env, org);
  const period = calendarMonthUtc(now * 1000);
  const [projects, storage, keys, deliveries] = await Promise.all([
    countLiveProjects(env.DB, orgId),
    orgStorageBytesUsed(env.DB, orgId),
    countActiveProjectKeys(env.DB, orgId, now),
    loadDeliveryMonth(env.DB, orgId, period),
  ]);
  return {
    plan: entitlements.plan,
    interval: entitlements.interval,
    status: entitlements.status,
    periodEnd: entitlements.periodEnd,
    cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
    projects: { used: projects, limit: entitlements.config.projectLimit },
    storage: { used: storage, limit: entitlements.config.storageBytesLimit },
    deliveries: {
      used: deliveries.count,
      limit: entitlements.config.deliveryLimitMonthly,
      period,
      warned: deliveries.warnedAt != null,
      over: deliveries.overAt != null,
      graceUntil: deliveries.graceUntil,
    },
    keys: { used: keys, limit: entitlements.config.projectKeyLimit },
  };
}

function trackQuotaBlocked(env: { ANALYTICS?: AnalyticsEngineDataset }, reason: QuotaBlockReason): void {
  track(env.ANALYTICS, "web_assets_quota_blocked", { reason });
}
