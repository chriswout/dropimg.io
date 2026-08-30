import { describe, expect, it } from "vitest";
import { billingConfig, stripeMode } from "../../src/lib/billing/stripe";

const configured = {
  BILLING_ENABLED: "true",
  STRIPE_PRICE_MONTHLY: "price_monthly",
  STRIPE_PRICE_ANNUAL: "price_annual",
} as const;

describe("which Stripe account we talk to", () => {
  it("reads the mode off the key, so the two can never disagree", () => {
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_test_abc" })).toBe("test");
    expect(stripeMode({ STRIPE_SECRET_KEY: "rk_test_abc" })).toBe("test");
    expect(stripeMode({ STRIPE_SECRET_KEY: "sk_live_abc" })).toBe("live");
    expect(stripeMode({ STRIPE_SECRET_KEY: "rk_live_abc" })).toBe("live");
    expect(
      billingConfig({ ...configured, STRIPE_SECRET_KEY: "sk_live_abc" })?.mode,
    ).toBe("live");
  });

  it("refuses to guess, so a mangled key cannot reach an account", () => {
    for (const key of ["sk_", "pk_test_abc", "sk_prod_abc", "", undefined]) {
      expect(stripeMode({ STRIPE_SECRET_KEY: key })).toBeNull();
      expect(billingConfig({ ...configured, STRIPE_SECRET_KEY: key })).toBeNull();
    }
  });

  it("stays closed until both prices are configured", () => {
    const key = "sk_test_abc";
    expect(billingConfig({ BILLING_ENABLED: "true", STRIPE_SECRET_KEY: key })).toBeNull();
    expect(
      billingConfig({
        BILLING_ENABLED: "true",
        STRIPE_SECRET_KEY: key,
        STRIPE_PRICE_MONTHLY: "price_monthly",
      }),
    ).toBeNull();
    expect(
      billingConfig({ ...configured, STRIPE_SECRET_KEY: key }),
    ).toEqual({
      mode: "test",
      priceMonthly: "price_monthly",
      priceAnnual: "price_annual",
    });
  });

  it("stays closed while billing is switched off", () => {
    expect(
      billingConfig({ ...configured, BILLING_ENABLED: "false", STRIPE_SECRET_KEY: "sk_test_abc" }),
    ).toBeNull();
  });
});
