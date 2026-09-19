import { describe, expect, it } from "vitest";
import { getSubscriptionEntitlementState } from "../../src/lib/billing/lifecycle";

const now = 1_700_000_000;

describe("getSubscriptionEntitlementState", () => {
  it("treats a missing row as free / checkout allowed", () => {
    const s = getSubscriptionEntitlementState(null, now);
    expect(s.entitled).toBe(false);
    expect(s.checkoutAllowed).toBe(true);
    expect(s.planChangeAllowed).toBe(false);
    expect(s.cancelAllowed).toBe(false);
  });

  it("allows plan change and cancel while active", () => {
    const s = getSubscriptionEntitlementState(
      { status: "active", current_period_end: now + 86400, cancel_at_period_end: 0 },
      now,
    );
    expect(s.state).toBe("active");
    expect(s.entitled).toBe(true);
    expect(s.checkoutAllowed).toBe(false);
    expect(s.planChangeAllowed).toBe(true);
    expect(s.cancelAllowed).toBe(true);
    expect(s.uiStatus).toBe("Active");
  });

  it("keeps paid-through access after cancel and blocks a new checkout", () => {
    const s = getSubscriptionEntitlementState(
      { status: "canceled", current_period_end: now + 86400, cancel_at_period_end: 1 },
      now,
    );
    expect(s.state).toBe("canceled_paid_through");
    expect(s.entitled).toBe(true);
    expect(s.checkoutAllowed).toBe(false);
    expect(s.planChangeAllowed).toBe(false);
    expect(s.cancelAllowed).toBe(false);
  });

  it("does not grant access while suspended", () => {
    const s = getSubscriptionEntitlementState(
      { status: "suspended", current_period_end: now + 86400, cancel_at_period_end: 0 },
      now,
    );
    expect(s.state).toBe("suspended");
    expect(s.entitled).toBe(false);
    expect(s.planChangeAllowed).toBe(false);
    expect(s.checkoutAllowed).toBe(false);
  });

  it("does not grant access when expired", () => {
    const s = getSubscriptionEntitlementState(
      { status: "expired", current_period_end: now - 1, cancel_at_period_end: 0 },
      now,
    );
    expect(s.state).toBe("expired");
    expect(s.entitled).toBe(false);
    expect(s.checkoutAllowed).toBe(true);
  });

  it("fails closed on unknown status", () => {
    const s = getSubscriptionEntitlementState(
      { status: "weird", current_period_end: now + 86400, cancel_at_period_end: 0 },
      now,
    );
    expect(s.state).toBe("unknown");
    expect(s.entitled).toBe(false);
    expect(s.planChangeAllowed).toBe(false);
    expect(s.checkoutAllowed).toBe(false);
  });

  it("treats approval_pending as in-progress", () => {
    const s = getSubscriptionEntitlementState(
      { status: "approval_pending", current_period_end: null, cancel_at_period_end: 0 },
      now,
    );
    expect(s.state).toBe("approval_pending");
    expect(s.entitled).toBe(false);
    expect(s.checkoutAllowed).toBe(false);
  });
});
