import { describe, expect, it } from "vitest";
import { billingConfig, paypalMode } from "../../src/lib/billing/paypal";

const configured = {
  BILLING_ENABLED: "true",
  PAYPAL_CLIENT_ID: "client-id",
  PAYPAL_CLIENT_SECRET: "client-secret",
  PAYPAL_PLAN_MONTHLY: "P-monthly",
  PAYPAL_PLAN_ANNUAL: "P-annual",
} as const;

describe("which PayPal account we talk to", () => {
  it("reads the mode off PAYPAL_ENV, so host and mode cannot disagree", () => {
    expect(paypalMode({ PAYPAL_ENV: "sandbox" })).toBe("test");
    expect(paypalMode({ PAYPAL_ENV: "live" })).toBe("live");
    expect(paypalMode({ PAYPAL_ENV: "SANDBOX" })).toBe("test");
    expect(
      billingConfig({ ...configured, PAYPAL_ENV: "live" })?.mode,
    ).toBe("live");
  });

  it("refuses to guess, so a mangled env cannot reach an account", () => {
    for (const value of ["prod", "test", "sk_live_abc", "", undefined]) {
      expect(paypalMode({ PAYPAL_ENV: value })).toBeNull();
      expect(billingConfig({ ...configured, PAYPAL_ENV: value })).toBeNull();
    }
  });

  it("stays closed until both plans and credentials are configured", () => {
    expect(billingConfig({ BILLING_ENABLED: "true", PAYPAL_ENV: "sandbox" })).toBeNull();
    expect(
      billingConfig({
        BILLING_ENABLED: "true",
        PAYPAL_ENV: "sandbox",
        PAYPAL_CLIENT_ID: "client-id",
        PAYPAL_CLIENT_SECRET: "client-secret",
        PAYPAL_PLAN_MONTHLY: "P-monthly",
      }),
    ).toBeNull();
    expect(
      billingConfig({ ...configured, PAYPAL_ENV: "sandbox" }),
    ).toEqual({
      mode: "test",
      priceMonthly: "P-monthly",
      priceAnnual: "P-annual",
    });
  });

  it("stays closed while billing is switched off", () => {
    expect(
      billingConfig({ ...configured, BILLING_ENABLED: "false", PAYPAL_ENV: "sandbox" }),
    ).toBeNull();
  });
});
