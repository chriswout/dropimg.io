import { describe, expect, it } from "vitest";
import { billingConfig, paddleApiBase } from "../../src/lib/billing/paddle";

const configured = {
  BILLING_ENABLED: "true",
  PADDLE_CLIENT_TOKEN: "live_token",
  PADDLE_PRICE_MONTHLY: "pri_monthly",
  PADDLE_PRICE_ANNUAL: "pri_annual",
} as const;

describe("which Paddle account we talk to", () => {
  it("treats Paddle's own word for production as production", () => {
    for (const value of ["production", "live", "LIVE", " live "]) {
      expect(paddleApiBase({ PADDLE_ENV: value })).toBe("https://api.paddle.com");
      expect(billingConfig({ ...configured, PADDLE_ENV: value })?.env).toBe(
        "production",
      );
    }
  });

  it("reads sandbox as sandbox", () => {
    expect(paddleApiBase({ PADDLE_ENV: "sandbox" })).toBe(
      "https://sandbox-api.paddle.com",
    );
    expect(billingConfig({ ...configured, PADDLE_ENV: "sandbox" })?.env).toBe(
      "sandbox",
    );
  });

  it("refuses to guess, so a typo cannot reach the wrong account", () => {
    for (const value of ["prod", "PRODUCTION_", "", undefined]) {
      expect(paddleApiBase({ PADDLE_ENV: value })).toBeNull();
      expect(billingConfig({ ...configured, PADDLE_ENV: value })).toBeNull();
    }
  });
});
