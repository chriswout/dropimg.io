import { describe, expect, it } from "vitest";
import {
  mediaControlPlaneEnabled,
  mediaDeliveryEnabled,
  mediaEnabled,
} from "../../src/lib/media-config";
import { resolveWebAssetsEntitlements } from "../../src/lib/web-assets-entitlements";
import { assertStorageFits } from "../../src/lib/web-assets-quota";
import {
  calendarMonthUtc,
  WEB_ASSETS_PLANS,
  webAssetsPlanRank,
} from "../../src/lib/web-assets-plans";
import {
  billingProductForPriceId,
  planChangeKind,
  webAssetsBillingConfig,
} from "../../src/lib/billing/paypal";

const waEnv = {
  BILLING_ENABLED: "true",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "id",
  PAYPAL_CLIENT_SECRET: "secret",
  PAYPAL_WA_DEVELOPER_MONTHLY: "P-dev-m",
  PAYPAL_WA_DEVELOPER_ANNUAL: "P-dev-y",
  PAYPAL_WA_PRO_MONTHLY: "P-pro-m",
  PAYPAL_WA_PRO_ANNUAL: "P-pro-y",
};

describe("Web Assets plan catalog", () => {
  it("matches the public pricing page", () => {
    expect(WEB_ASSETS_PLANS.free).toMatchObject({
      projectLimit: 3,
      storageBytesLimit: 1024 ** 3,
      deliveryLimitMonthly: 100_000,
      projectKeyLimit: 2,
    });
    expect(WEB_ASSETS_PLANS.developer).toMatchObject({
      projectLimit: 20,
      storageBytesLimit: 10 * 1024 ** 3,
      deliveryLimitMonthly: 2_000_000,
      projectKeyLimit: 20,
    });
    expect(WEB_ASSETS_PLANS.pro).toMatchObject({
      projectLimit: 100,
      storageBytesLimit: 100 * 1024 ** 3,
      deliveryLimitMonthly: 10_000_000,
      projectKeyLimit: 100,
    });
  });

  it("uses calendar month UTC for delivery reset", () => {
    expect(calendarMonthUtc(Date.UTC(2026, 8, 17))).toBe("2026-09");
    expect(calendarMonthUtc(Date.UTC(2026, 11, 31, 23, 59))).toBe("2026-12");
  });
});

describe("Web Assets entitlements", () => {
  it("stays Free without a trusted subscription", () => {
    const got = resolveWebAssetsEntitlements({ subscription: null, env: waEnv });
    expect(got.plan).toBe("free");
    expect(got.config.projectLimit).toBe(3);
  });

  it("maps a verified Developer price id", () => {
    const got = resolveWebAssetsEntitlements({
      env: waEnv,
      subscription: {
        status: "active",
        price_id: "P-dev-m",
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        cancel_at_period_end: 0,
      },
    });
    expect(got.plan).toBe("developer");
    expect(got.interval).toBe("monthly");
  });

  it("does not grant Pro from a client-looking price id", () => {
    const got = resolveWebAssetsEntitlements({
      env: waEnv,
      subscription: {
        status: "active",
        price_id: "P-forged",
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        cancel_at_period_end: 0,
      },
    });
    expect(got.plan).toBe("free");
  });

  it("keeps paid access through period end after cancel", () => {
    const got = resolveWebAssetsEntitlements({
      env: waEnv,
      subscription: {
        status: "canceled",
        price_id: "P-pro-y",
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        cancel_at_period_end: 1,
      },
    });
    expect(got.plan).toBe("pro");
  });
});

describe("quota and flags", () => {
  it("blocks storage that would exceed the plan", () => {
    const over = assertStorageFits(WEB_ASSETS_PLANS.free.storageBytesLimit, 1, WEB_ASSETS_PLANS.free.storageBytesLimit);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.status).toBe(413);
  });

  it("allows replacement that stays under the plan", () => {
    expect(assertStorageFits(100, 50, 200).ok).toBe(true);
  });

  it("splits control plane from public delivery", () => {
    expect(mediaEnabled({ MEDIA_ENABLED: "false", MEDIA_DELIVERY_ENABLED: "true" })).toBe(false);
    expect(mediaControlPlaneEnabled({ MEDIA_ENABLED: "false" })).toBe(false);
    expect(mediaDeliveryEnabled({ MEDIA_ENABLED: "false", MEDIA_DELIVERY_ENABLED: "true" })).toBe(true);
    expect(mediaDeliveryEnabled({ MEDIA_ENABLED: "true" })).toBe(true);
  });

  it("ranks plan changes for analytics", () => {
    expect(planChangeKind("free", "developer")).toBe("activated");
    expect(planChangeKind("developer", "pro")).toBe("upgraded");
    expect(planChangeKind("pro", "developer")).toBe("downgraded");
    expect(webAssetsPlanRank("pro")).toBeGreaterThan(webAssetsPlanRank("developer"));
  });

  it("does not reuse Drop Pro SKUs for Web Assets", () => {
    const env = {
      ...waEnv,
      PAYPAL_PLAN_MONTHLY: "P-drop-m",
      PAYPAL_PLAN_ANNUAL: "P-drop-y",
    };
    expect(billingProductForPriceId(env, "P-drop-m")).toBe("drops_pro");
    expect(billingProductForPriceId(env, "P-dev-m")).toBe("web_assets");
    expect(webAssetsBillingConfig(env)?.developerMonthly).toBe("P-dev-m");
  });
});
