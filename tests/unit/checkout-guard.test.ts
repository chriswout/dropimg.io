import { describe, expect, it } from "vitest";
import {
  checkoutBlockForRows,
  checkoutBlockMessage,
  pendingCheckoutId,
} from "../../src/lib/billing/checkout-guard";

const now = 1_700_000_000;

describe("checkoutBlockForRows", () => {
  it("blocks a second Drops Pro checkout while active", () => {
    const block = checkoutBlockForRows(
      [
        {
          status: "active",
          current_period_end: now + 86400,
          cancel_at_period_end: 0,
          updated_at: now,
          provider_subscription_id: "I-live",
        },
      ],
      { product: "drops_pro", now },
    );
    expect(block?.code).toBe("already_subscribed");
    expect(block?.manage).toBe("/app/billing");
  });

  it("blocks Drops Pro while canceled but still paid-through", () => {
    const block = checkoutBlockForRows(
      [
        {
          status: "canceled",
          current_period_end: now + 86400,
          cancel_at_period_end: 1,
          updated_at: now,
          provider_subscription_id: "I-cancel",
        },
      ],
      { product: "drops_pro", now },
    );
    expect(block?.code).toBe("already_subscribed");
  });

  it("treats a fresh approval_pending row as in-progress", () => {
    const block = checkoutBlockForRows(
      [
        {
          status: "approval_pending",
          current_period_end: null,
          updated_at: now - 60,
          provider_subscription_id: pendingCheckoutId("drops_pro", "user-1"),
        },
      ],
      { product: "drops_pro", now },
    );
    expect(block?.code).toBe("checkout_in_progress");
    expect(block?.error).toMatch(/cancelled on PayPal/i);
  });

  it("does not block on a stale approval_pending row", () => {
    const block = checkoutBlockForRows(
      [
        {
          status: "approval_pending",
          current_period_end: null,
          updated_at: now - 31 * 60,
          provider_subscription_id: pendingCheckoutId("drops_pro", "user-1"),
        },
      ],
      { product: "drops_pro", now },
    );
    expect(block).toBeNull();
  });

  it("blocks Web Assets plan changes while a paid sub is live", () => {
    const block = checkoutBlockForRows(
      [
        {
          status: "active",
          current_period_end: now + 86400,
          cancel_at_period_end: 0,
          updated_at: now,
          provider_subscription_id: "I-wa",
        },
      ],
      { product: "web_assets", now },
    );
    expect(block?.code).toBe("plan_change_blocked");
    expect(checkoutBlockMessage("plan_change_blocked", "web_assets")).toMatch(
      /second subscription/i,
    );
  });

  it("allows a new Drops Pro checkout after expiry", () => {
    const block = checkoutBlockForRows(
      [
        {
          status: "canceled",
          current_period_end: now - 1,
          cancel_at_period_end: 1,
          updated_at: now - 10,
          provider_subscription_id: "I-old",
        },
      ],
      { product: "drops_pro", now },
    );
    expect(block).toBeNull();
  });
});
