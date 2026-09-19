import { describe, expect, it } from "vitest";
import {
  billingConfig,
  mapPaypalSubscriptionStatus,
  paypalCatalogCollision,
  resolvePaidThroughPeriodEnd,
  webAssetsBillingConfig,
} from "../../src/lib/billing/paypal";

const now = 1_700_000_000;

describe("mapPaypalSubscriptionStatus", () => {
  it("keeps CANCELLED distinct from EXPIRED", () => {
    expect(
      mapPaypalSubscriptionStatus("CANCELLED", "BILLING.SUBSCRIPTION.CANCELLED"),
    ).toBe("canceled");
    expect(
      mapPaypalSubscriptionStatus("EXPIRED", "BILLING.SUBSCRIPTION.EXPIRED"),
    ).toBe("expired");
    expect(mapPaypalSubscriptionStatus("SUSPENDED", "BILLING.SUBSCRIPTION.SUSPENDED")).toBe(
      "suspended",
    );
    expect(
      mapPaypalSubscriptionStatus("APPROVAL_PENDING", "BILLING.SUBSCRIPTION.CREATED"),
    ).toBe("approval_pending");
  });
});

describe("resolvePaidThroughPeriodEnd", () => {
  it("keeps the prepaid end when CANCELLED omits next_billing_time", () => {
    expect(
      resolvePaidThroughPeriodEnd({
        incoming: null,
        previous: now + 20 * 86400,
        status: "canceled",
        now,
      }),
    ).toBe(now + 20 * 86400);
  });

  it("uses incoming next_billing_time when PayPal still sends it", () => {
    expect(
      resolvePaidThroughPeriodEnd({
        incoming: now + 10 * 86400,
        previous: now + 20 * 86400,
        status: "canceled",
        now,
      }),
    ).toBe(now + 10 * 86400);
  });

  it("does not keep a future end on EXPIRED", () => {
    const end = resolvePaidThroughPeriodEnd({
      incoming: null,
      previous: now + 20 * 86400,
      status: "expired",
      now,
    });
    expect(end).toBe(now);
  });
});

describe("paypal catalog isolation", () => {
  it("disables checkout when a Drops Pro id collides with Web Assets", () => {
    const env = {
      BILLING_ENABLED: "true",
      PAYPAL_ENV: "sandbox",
      PAYPAL_CLIENT_ID: "id",
      PAYPAL_CLIENT_SECRET: "secret",
      PAYPAL_PLAN_MONTHLY: "P-same",
      PAYPAL_PLAN_ANNUAL: "P-drop-y",
      PAYPAL_WA_DEVELOPER_MONTHLY: "P-same",
      PAYPAL_WA_DEVELOPER_ANNUAL: "P-wa-y",
      PAYPAL_WA_PRO_MONTHLY: "P-wa-pm",
      PAYPAL_WA_PRO_ANNUAL: "P-wa-py",
    };
    expect(paypalCatalogCollision(env)).toBe(true);
    expect(billingConfig(env)).toBeNull();
    expect(webAssetsBillingConfig(env)).toBeNull();
  });
});
