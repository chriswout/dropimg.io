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

  it("falls back to sandbox for anything else, so a typo cannot charge anyone", () => {
    for (const value of ["sandbox", "prod", "", undefined]) {
      expect(paddleApiBase({ PADDLE_ENV: value })).toBe(
        "https://sandbox-api.paddle.com",
      );
      expect(billingConfig({ ...configured, PADDLE_ENV: value })?.env).toBe(
        "sandbox",
      );
    }
  });
});
