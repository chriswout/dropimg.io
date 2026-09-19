/** Canonical DropIMG billing state. Do not scatter these checks in routes. */

import { isProSubscription, type SubscriptionSnapshot } from "../entitlements";

export type BillingLifecycleState =
  | "approval_pending"
  | "active"
  | "suspended"
  | "canceled_paid_through"
  | "canceled"
  | "expired"
  | "unknown";

export type SubscriptionEntitlementState = {
  rawStatus: string;
  state: BillingLifecycleState;
  /** Paid access for this product right now. */
  entitled: boolean;
  checkoutAllowed: boolean;
  planChangeAllowed: boolean;
  cancelAllowed: boolean;
  uiStatus: string;
};

const UI: Record<BillingLifecycleState, string> = {
  approval_pending: "Pending approval",
  active: "Active",
  suspended: "Suspended",
  canceled_paid_through: "Cancels at period end",
  canceled: "Canceled",
  expired: "Expired",
  unknown: "Unknown",
};

export function getSubscriptionEntitlementState(
  sub: SubscriptionSnapshot | null | undefined,
  now = Math.floor(Date.now() / 1000),
): SubscriptionEntitlementState {
  if (!sub) {
    return {
      rawStatus: "",
      state: "expired",
      entitled: false,
      checkoutAllowed: true,
      planChangeAllowed: false,
      cancelAllowed: false,
      uiStatus: "Free",
    };
  }

  const rawStatus = sub.status.trim().toLowerCase();
  const entitled = isProSubscription(sub, now);
  const paidThrough =
    sub.current_period_end != null && sub.current_period_end > now;

  let state: BillingLifecycleState;
  if (rawStatus === "approval_pending") state = "approval_pending";
  else if (rawStatus === "suspended") state = "suspended";
  else if (rawStatus === "expired") state = "expired";
  else if (rawStatus === "canceled" || rawStatus === "cancelled") {
    state = paidThrough ? "canceled_paid_through" : "canceled";
  } else if (rawStatus === "active" || rawStatus === "approved" || rawStatus === "trialing") {
    state = entitled ? "active" : "expired";
  } else if (rawStatus === "past_due" || rawStatus === "paused") {
    state = entitled ? "active" : "unknown";
  } else {
    state = "unknown";
  }

  const liveActive = state === "active" && entitled && !Boolean(sub.cancel_at_period_end);

  return {
    rawStatus,
    state,
    entitled,
    checkoutAllowed: !entitled && state !== "approval_pending" && state !== "suspended" && state !== "unknown",
    planChangeAllowed: liveActive,
    cancelAllowed: liveActive,
    uiStatus: state === "active" && Boolean(sub.cancel_at_period_end)
      ? UI.canceled_paid_through
      : UI[state],
  };
}
