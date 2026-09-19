import { sendMail } from "../email";
import { catalogForPriceIdLocal } from "./plan-label";
import { billingLog } from "./log";
import { productTitle } from "./catalog";
import type { BillingEnv, BillingProduct } from "./types";

export type DunningType =
  | "payment_failed"
  | "subscription_suspended"
  | "payment_recovered"
  | "subscription_ended";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export async function claimNotification(
  db: D1Database,
  opts: {
    eventId: string;
    type: DunningType;
    userId: string | null;
    subscriptionId: string | null;
    now: number;
  },
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        `INSERT INTO billing_notifications (
           provider, event_id, notification_type, user_id, subscription_id, sent_at
         ) VALUES ('paypal', ?, ?, ?, ?, ?)`,
      )
      .bind(opts.eventId, opts.type, opts.userId, opts.subscriptionId, opts.now)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  } catch {
    return false;
  }
}

export function dunningEmail(opts: {
  type: DunningType;
  productLabel: string;
  manageUrl: string;
}): { subject: string; text: string; html: string } {
  if (opts.type === "payment_failed") {
    return {
      subject: "Payment issue with your DropIMG subscription",
      text: `We couldn't confirm your latest DropIMG subscription payment.\n\nProduct:\n${opts.productLabel}\n\nYour subscription may lose paid access if the payment issue isn't resolved.\n\nManage payment in PayPal:\n${opts.manageUrl}\n`,
      html: `<p>We couldn't confirm your latest DropIMG subscription payment.</p><p>Product:<br>${esc(opts.productLabel)}</p><p>Your subscription may lose paid access if the payment issue isn't resolved.</p><p><a href="${esc(opts.manageUrl)}">Manage payment in PayPal</a></p>`,
    };
  }
  if (opts.type === "subscription_suspended") {
    return {
      subject: "Your DropIMG subscription needs attention",
      text: `PayPal has suspended your DropIMG subscription after a payment issue.\n\nProduct:\n${opts.productLabel}\n\nPaid access is currently unavailable. Update your payment details in PayPal to restore it.\n\nManage payment in PayPal:\n${opts.manageUrl}\n`,
      html: `<p>PayPal has suspended your DropIMG subscription after a payment issue.</p><p>Product:<br>${esc(opts.productLabel)}</p><p>Paid access is currently unavailable. Update your payment details in PayPal to restore it.</p><p><a href="${esc(opts.manageUrl)}">Manage payment in PayPal</a></p>`,
    };
  }
  if (opts.type === "payment_recovered") {
    return {
      subject: "Your DropIMG subscription is active again",
      text: `Your DropIMG subscription is active again.\n\nProduct:\n${opts.productLabel}\n\nPaid access has been restored.\n`,
      html: `<p>Your DropIMG subscription is active again.</p><p>Product:<br>${esc(opts.productLabel)}</p><p>Paid access has been restored.</p>`,
    };
  }
  return {
    subject: "Your DropIMG subscription has ended",
    text: `Your DropIMG subscription has ended because the paid period is over.\n\nProduct:\n${opts.productLabel}\n\nYou can subscribe again from your DropIMG billing page when you are ready.\n`,
    html: `<p>Your DropIMG subscription has ended because the paid period is over.</p><p>Product:<br>${esc(opts.productLabel)}</p><p>You can subscribe again from your DropIMG billing page when you are ready.</p>`,
  };
}

export async function maybeSendDunningEmail(
  env: Cloudflare.Env & BillingEnv,
  db: D1Database,
  opts: {
    eventId: string;
    type: DunningType;
    userId: string | null;
    subscriptionId: string | null;
    product: BillingProduct | null;
    planId: string | null;
    manageUrl: string;
    now: number;
  },
): Promise<boolean> {
  if (!opts.userId) return false;
  const claimed = await claimNotification(db, {
    eventId: opts.eventId,
    type: opts.type,
    userId: opts.userId,
    subscriptionId: opts.subscriptionId,
    now: opts.now,
  });
  if (!claimed) return false;

  const user = await db
    .prepare(`SELECT email FROM users WHERE id = ? AND deleted_at IS NULL`)
    .bind(opts.userId)
    .first<{ email: string }>();
  if (!user?.email) return false;

  const productLabel =
    catalogForPriceIdLocal(env, opts.planId) ||
    (opts.product ? productTitle(opts.product) : "DropIMG subscription");
  const msg = dunningEmail({
    type: opts.type,
    productLabel,
    manageUrl: opts.manageUrl,
  });
  const sent = await sendMail(env, {
    to: user.email,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  billingLog("dunning_email", {
    userId: opts.userId,
    subscriptionId: opts.subscriptionId,
    product: opts.product,
    planId: opts.planId,
    eventId: opts.eventId,
    transition: opts.type,
    result: sent.sent ? "sent" : sent.error || "skipped",
  });
  return sent.sent;
}
