import { describe, expect, it } from "vitest";
import { previewPlanChange, resolvePlanChangeTarget } from "../../src/lib/billing/revision";
import { revisePaypalSubscription } from "../../src/lib/billing/paypal";
import { dunningEmail } from "../../src/lib/billing/notifications";
import type { BillingEnv } from "../../src/lib/billing/types";
import type { OwnedSubscription } from "../../src/lib/billing/revision";

const now = 1_700_000_000;
const env: BillingEnv = {
  BILLING_ENABLED: "true",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "id",
  PAYPAL_CLIENT_SECRET: "secret",
  PAYPAL_PLAN_MONTHLY: "P-monthly",
  PAYPAL_PLAN_ANNUAL: "P-annual",
  PAYPAL_WA_DEVELOPER_MONTHLY: "P-wa-dev-m",
  PAYPAL_WA_DEVELOPER_ANNUAL: "P-wa-dev-y",
  PAYPAL_WA_PRO_MONTHLY: "P-wa-pro-m",
  PAYPAL_WA_PRO_ANNUAL: "P-wa-pro-y",
};

function row(overrides: Partial<OwnedSubscription> = {}): OwnedSubscription {
  return {
    status: "active",
    price_id: "P-wa-dev-m",
    current_period_end: now + 30 * 86400,
    cancel_at_period_end: 0,
    provider_subscription_id: "I-row",
    product: "web_assets",
    pending_price_id: null,
    pending_effective_at: null,
    ...overrides,
  };
}

describe("resolvePlanChangeTarget", () => {
  it("maps Web Assets Developer → Pro monthly", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "pro",
      interval: "monthly",
    });
    expect("priceId" in target && target.priceId).toBe("P-wa-pro-m");
  });

  it("rejects a Drops plan on the Web Assets product", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "pro",
      interval: "weekly",
    });
    expect("error" in target).toBe(true);
  });

  it("rejects an unknown interval", () => {
    const target = resolvePlanChangeTarget(env, "drops_pro", { interval: "lifetime" });
    expect("error" in target).toBe(true);
  });
});

describe("previewPlanChange", () => {
  it("schedules Developer → Pro at next renewal with no proration", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "pro",
      interval: "monthly",
    });
    if ("error" in target) throw new Error(target.error);
    const preview = previewPlanChange(env, row(), target, now);
    if ("error" in preview) throw new Error(preview.error);
    expect(preview.proratedToday).toBe(false);
    expect(preview.effectiveAt).toBe(now + 30 * 86400);
    expect(preview.nextCharge).toContain("29.00");
  });

  it("schedules Pro → Developer at next renewal", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "developer",
      interval: "monthly",
    });
    if ("error" in target) throw new Error(target.error);
    const preview = previewPlanChange(
      env,
      row({ price_id: "P-wa-pro-m" }),
      target,
      now,
    );
    if ("error" in preview) throw new Error(preview.error);
    expect(preview.nextLabel).toMatch(/Developer/);
  });

  it("schedules monthly → annual", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "developer",
      interval: "annual",
    });
    if ("error" in target) throw new Error(target.error);
    const preview = previewPlanChange(env, row(), target, now);
    if ("error" in preview) throw new Error(preview.error);
    expect(preview.nextCharge).toContain("90.00");
  });

  it("schedules annual → monthly", () => {
    const target = resolvePlanChangeTarget(env, "drops_pro", { interval: "monthly" });
    if ("error" in target) throw new Error(target.error);
    const preview = previewPlanChange(
      env,
      row({ product: "drops_pro", price_id: "P-annual" }),
      target,
      now,
    );
    if ("error" in preview) throw new Error(preview.error);
    expect(preview.nextCharge).toContain("2.99");
  });

  it("blocks a second overlapping pending revision", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "pro",
      interval: "monthly",
    });
    if ("error" in target) throw new Error(target.error);
    const preview = previewPlanChange(
      env,
      row({
        pending_price_id: "P-wa-dev-y",
        pending_effective_at: now + 10 * 86400,
      }),
      target,
      now,
    );
    expect("code" in preview && preview.code).toBe("revision_in_progress");
  });

  it("blocks canceled and suspended subscriptions", () => {
    const target = resolvePlanChangeTarget(env, "web_assets", {
      plan: "pro",
      interval: "monthly",
    });
    if ("error" in target) throw new Error(target.error);
    const canceled = previewPlanChange(
      env,
      row({ status: "canceled", cancel_at_period_end: 1 }),
      target,
      now,
    );
    expect("code" in canceled && canceled.code).toBe("plan_change_blocked");
    const suspended = previewPlanChange(env, row({ status: "suspended" }), target, now);
    expect("code" in suspended && suspended.code).toBe("plan_change_blocked");
  });
});

describe("revisePaypalSubscription", () => {
  it("posts plan_id to the existing I-… and returns an approve URL", async () => {
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 300 }), {
          status: 200,
        });
      }
      expect(url).toContain("/v1/billing/subscriptions/I-live/revise");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body.plan_id).toBe("P-wa-pro-m");
      return new Response(
        JSON.stringify({
          id: "I-live",
          links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=x" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const res = await revisePaypalSubscription(
      env,
      {
        subscriptionId: "I-live",
        planId: "P-wa-pro-m",
        successUrl: "https://dropimg.io/app/billing?revise=success",
        cancelUrl: "https://dropimg.io/app/billing",
      },
      fetchImpl,
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.approveUrl).toContain("paypal.com");
  });
});

describe("dunningEmail", () => {
  it("keeps failed-payment copy calm and names the product", () => {
    const msg = dunningEmail({
      type: "payment_failed",
      productLabel: "Web Assets Developer — $9.00/month",
      manageUrl: "https://www.paypal.com/myaccount/autopay",
    });
    expect(msg.subject).toBe("Payment issue with your DropIMG subscription");
    expect(msg.text).toContain("Web Assets Developer");
    expect(msg.text).not.toMatch(/urgent|immediately|legal action/i);
  });
});
