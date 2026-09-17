/** Canonical Web Assets plan catalog. Display copy must match these numbers. */

export const WEB_ASSETS_PLAN_IDS = ["free", "developer", "pro"] as const;
export type WebAssetsPlanId = (typeof WEB_ASSETS_PLAN_IDS)[number];

export const WEB_ASSETS_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const WEB_ASSETS_DELIVERY_GRACE_SECONDS = 3 * 24 * 60 * 60;
export const WEB_ASSETS_DELIVERY_WARN_RATIO = 0.8;

const GIB = 1024 * 1024 * 1024;

export type WebAssetsPlanConfig = {
  id: WebAssetsPlanId;
  projectLimit: number;
  storageBytesLimit: number;
  deliveryLimitMonthly: number;
  projectKeyLimit: number;
  maxFileBytes: number;
};

export const WEB_ASSETS_PLANS: Record<WebAssetsPlanId, WebAssetsPlanConfig> = {
  free: {
    id: "free",
    projectLimit: 3,
    storageBytesLimit: 1 * GIB,
    deliveryLimitMonthly: 100_000,
    projectKeyLimit: 2,
    maxFileBytes: WEB_ASSETS_MAX_FILE_BYTES,
  },
  developer: {
    id: "developer",
    projectLimit: 20,
    storageBytesLimit: 10 * GIB,
    deliveryLimitMonthly: 2_000_000,
    projectKeyLimit: 20,
    maxFileBytes: WEB_ASSETS_MAX_FILE_BYTES,
  },
  pro: {
    id: "pro",
    projectLimit: 100,
    storageBytesLimit: 100 * GIB,
    deliveryLimitMonthly: 10_000_000,
    projectKeyLimit: 100,
    maxFileBytes: WEB_ASSETS_MAX_FILE_BYTES,
  },
};

export function webAssetsPlanConfig(id: WebAssetsPlanId): WebAssetsPlanConfig {
  return WEB_ASSETS_PLANS[id];
}

export function webAssetsPlanRank(id: WebAssetsPlanId): number {
  if (id === "pro") return 2;
  if (id === "developer") return 1;
  return 0;
}

/** Calendar month in UTC, `YYYY-MM`. Free and paid share this reset. */
export function calendarMonthUtc(nowMs = Date.now()): string {
  const d = new Date(nowMs);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}`;
}
