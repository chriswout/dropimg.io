import { BILLING_URL, brandedText, renderBrandedEmail, sendMail } from "../email";
import { catalogForPriceIdLocal } from "./plan-label";
import { billingLog } from "./log";
import { formatMoney, productTitle } from "./catalog";
import type { BillingEnv, BillingProduct } from "./types";

export type DunningType =
  | "payment_failed"
  | "subscription_suspended"
  | "payment_recovered"
  | "subscription_ended";

export type BillingNoticeType = DunningType | "payment_receipt" | "payment_refunded";

export async function claimNotification(
  db: D1Database,
  opts: {
    eventId: string;
    type: BillingNoticeType;
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
  billingUrl?: string;
}): { subject: string; text: string; html: string } {
  const billingUrl = opts.billingUrl || BILLING_URL;
  const plan = { label: "Plan", value: opts.productLabel };
  if (opts.type === "payment_failed") {
    const body = {
      heading: "We couldn't take your latest payment",
      paragraphs: [
        "PayPal couldn't take the latest payment for this plan.",
        "Updating your payment method there usually fixes it. If it stays unpaid, the plan may pause.",
      ],
      meta: plan,
      cta: { href: opts.manageUrl, label: "Update payment in PayPal" },
      secondary: { href: billingUrl, label: "View your billing" },
    };
    return {
      subject: "We couldn't take your DropIMG payment",
      text: brandedText(body),
      html: renderBrandedEmail({
        ...body,
        preheader: "PayPal couldn't take the latest payment for this plan.",
        accent: "warning",
      }),
    };
  }
  if (opts.type === "subscription_suspended") {
    const body = {
      heading: "Your plan is paused for now",
      paragraphs: [
        "PayPal paused this plan after a payment didn't go through.",
        "You won't have this plan's extras until you update the payment method in PayPal.",
      ],
      meta: plan,
      cta: { href: opts.manageUrl, label: "Update payment in PayPal" },
      secondary: { href: billingUrl, label: "View your billing" },
    };
    return {
      subject: "Your DropIMG plan is paused",
      text: brandedText(body),
      html: renderBrandedEmail({
        ...body,
        preheader: "PayPal paused this plan after a payment didn't go through.",
        accent: "danger",
      }),
    };
  }
  if (opts.type === "payment_recovered") {
    const body = {
      heading: "You're all set",
      paragraphs: [
        "The payment went through, so this plan is active again.",
        "Nothing else you need to do.",
      ],
      meta: plan,
      cta: { href: billingUrl, label: "View your billing" },
    };
    return {
      subject: "Your DropIMG plan is active again",
      text: brandedText(body),
      html: renderBrandedEmail({
        ...body,
        preheader: "The payment went through, so this plan is active again.",
        accent: "success",
      }),
    };
  }
  const body = {
    heading: "This plan has ended",
    paragraphs: [
      "The time you already paid for is over, so this plan is no longer active.",
      "You can start again from billing whenever you're ready.",
    ],
    meta: plan,
    cta: { href: billingUrl, label: "View your billing" },
  };
  return {
    subject: "Your DropIMG plan has ended",
    text: brandedText(body),
    html: renderBrandedEmail({
      ...body,
      preheader: "This plan has ended. You can start again from billing whenever you're ready.",
      accent: "neutral",
    }),
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

export function formatReceiptDate(unix: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(unix * 1000));
}

export function receiptEmail(opts: {
  kind: "paid" | "refunded";
  productLabel: string;
  amountLabel: string | null;
  dateLabel: string;
  receiptUrl: string | null;
  billingUrl?: string;
}): { subject: string; text: string; html: string } {
  const billingUrl = opts.billingUrl || BILLING_URL;
  const details = [
    { label: "Plan", value: opts.productLabel },
    ...(opts.amountLabel ? [{ label: "Amount", value: opts.amountLabel }] : []),
    { label: "Date", value: opts.dateLabel },
  ];
  const paypal = opts.receiptUrl
    ? { href: opts.receiptUrl, label: "View in PayPal" }
    : null;
  const billing = { href: billingUrl, label: "View your billing" };
  if (opts.kind === "refunded") {
    const body = {
      heading: "We refunded this payment",
      paragraphs: [
        "PayPal refunded this payment. It should show up on your PayPal account.",
      ],
      details,
      cta: paypal || billing,
      secondary: paypal ? billing : undefined,
      note: "This is your DropIMG receipt. PayPal processed the refund.",
    };
    return {
      subject: "We refunded your DropIMG payment",
      text: brandedText(body),
      html: renderBrandedEmail({
        ...body,
        preheader: opts.amountLabel
          ? `PayPal refunded ${opts.amountLabel} for ${opts.productLabel}.`
          : `PayPal refunded this payment for ${opts.productLabel}.`,
        accent: "neutral",
      }),
    };
  }
  const body = {
    heading: "Here's your receipt",
    paragraphs: ["Thanks — we received your payment for this plan."],
    details,
    cta: paypal || billing,
    secondary: paypal ? billing : undefined,
    note: "Keep this for your records. PayPal processed the payment.",
  };
  return {
    subject: opts.amountLabel
      ? `Your DropIMG receipt — ${opts.amountLabel}`
      : "Your DropIMG receipt",
    text: brandedText(body),
    html: renderBrandedEmail({
      ...body,
      preheader: opts.amountLabel
        ? `We received ${opts.amountLabel} for ${opts.productLabel}.`
        : `We received your payment for ${opts.productLabel}.`,
      accent: "success",
    }),
  };
}

export async function maybeSendReceiptEmail(
  env: Cloudflare.Env & BillingEnv,
  db: D1Database,
  opts: {
    eventId: string;
    kind: "paid" | "refunded";
    userId: string | null;
    subscriptionId: string | null;
    transactionId: string | null;
    now: number;
  },
): Promise<boolean> {
  if (!opts.userId || !opts.transactionId) return false;

  const payment = await db
    .prepare(
      `SELECT product, plan_id, amount, currency, paid_at, receipt_url
       FROM billing_payments
       WHERE provider = 'paypal' AND provider_transaction_id = ?
       LIMIT 1`,
    )
    .bind(opts.transactionId)
    .first<{
      product: BillingProduct;
      plan_id: string | null;
      amount: string | null;
      currency: string | null;
      paid_at: number | null;
      receipt_url: string | null;
    }>();
  if (!payment) return false;

  const claimed = await claimNotification(db, {
    eventId: opts.eventId,
    type: opts.kind === "refunded" ? "payment_refunded" : "payment_receipt",
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
    catalogForPriceIdLocal(env, payment.plan_id) || productTitle(payment.product);
  const amountLabel =
    payment.amount && payment.currency
      ? formatMoney(payment.amount, payment.currency)
      : payment.amount
        ? formatMoney(payment.amount, "")
        : null;
  const msg = receiptEmail({
    kind: opts.kind,
    productLabel,
    amountLabel,
    dateLabel: formatReceiptDate(payment.paid_at || opts.now),
    receiptUrl: payment.receipt_url,
  });
  const sent = await sendMail(env, {
    to: user.email,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  billingLog("receipt_email", {
    userId: opts.userId,
    subscriptionId: opts.subscriptionId,
    product: payment.product,
    planId: payment.plan_id,
    eventId: opts.eventId,
    transition: opts.kind,
    result: sent.sent ? "sent" : sent.error || "skipped",
  });
  return sent.sent;
}
