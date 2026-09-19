# KON-82 — Controlled live Web Assets PayPal purchase

**Do not mark KON-82 Done until this walkthrough has been completed with a
real production charge by a human.** Agents must not start a live payment.

Lowest-risk live paid plan: **Web Assets Developer monthly ($9)**.

Use a dedicated DropIMG account you control. Do not use a customer account.

See also [paypal-subscription-lifecycle.md](paypal-subscription-lifecycle.md).

## Before you start

1. Confirm production `PAYPAL_ENV=live`, `BILLING_ENABLED=true`.
2. Confirm live plan IDs in production vars match [paypal.md](paypal.md) and
   have not been swapped with sandbox IDs.
3. Confirm the live webhook destination is
   `https://dropimg.io/api/billing/paypal/webhook` with signature verification
   via `PAYPAL_WEBHOOK_ID`.
4. Sign in to Cloudflare and PayPal dashboards so you can read D1,
   `billing_events`, `billing_payments`, and the PayPal subscription.

## Walkthrough

### A–D. Subscribe, payment, entitlement, portal

1. Sign in on https://dropimg.io with the controlled test account.
2. Confirm `/app/billing` shows **Web Assets Free** and **No payments yet.**
3. Open `/pricing`, keep **Monthly**, choose **Developer**.
4. Approve the $9 subscription in PayPal.
5. Copy the PayPal subscription id (`I-…`) from the return URL, cookie, or
   PayPal dashboard.
6. In the PayPal developer dashboard, confirm the webhook delivery for
   `BILLING.SUBSCRIPTION.ACTIVATED` (and typically `PAYMENT.SALE.COMPLETED`)
   succeeded.
7. Confirm DropIMG returned 200 after signature verification (failed
   signatures are 400 and must not write `billing_events`).
8. In D1, confirm `billing_events` has `provider='paypal'` and the PayPal
   `event_id`, `status='processed'`. A replay of the same event should set
   `duplicate: true` and not create a second subscription or payment row.
9. Confirm `subscriptions.product = 'web_assets'` (never `drops_pro`).
10. Confirm `price_id` is the live Developer monthly plan id
    `P-65K96128FP9176350NKV6BLQ`.
11. Confirm `/api/account/me` `webAssets.plan` is `developer`.
12. Confirm `/app/billing` shows **Web Assets Developer**, **$9/month**,
    **Active**, a next-billing date, **Change plan**, **Manage in PayPal**,
    and **Cancel renewal**.
13. Confirm **Payment history** shows the $9 USD paid row (not labeled
    invoice). **View in PayPal** is present only if a transaction id exists.
14. Create or inspect a project: Developer limits apply (20 projects, 10 GB,
    20 keys, 2M monthly `/m/…` deliveries). Existing public `/m/…` aliases
    must keep working.

### E. Plan change

15. From `/app/billing`, open **Change plan** and choose Pro monthly.
    Confirm the dialog says the change is effective at next renewal and
    **No prorated charge today.**
16. Complete PayPal approval if shown. Do not expect a second `I-…`.
17. Confirm `pending_price_id` is the Pro monthly plan and `price_id` remains
    Developer until `pending_effective_at`. Entitlements stay Developer.

### F–G. Cancel renewal and paid-through access

18. **Cancel renewal** from DropIMG (not account deletion). Confirm the
    confirmation names the paid-through date.
19. Confirm the subscription row is `canceled` with `current_period_end` still
    in the future, and Developer entitlements remain until that timestamp.
20. After `current_period_end` (or a sandbox clock equivalent), confirm the
    account is Web Assets Free again. Existing `/m/…` aliases must still
    resolve; new projects/uploads/keys must respect Free caps.

### H–I. Receipts and failed payment

21. Re-check payment history after subscribe. A webhook replay must not
    duplicate the row. Confirm one `payment_receipt` notification is recorded
    (this is a receipt, not an invoice).
22. Failed-payment handling: only where PayPal sandbox can safely simulate
    `PAYMENT.FAILED` / `SUSPENDED`. Confirm one dunning email attempt is
    recorded in `billing_notifications` and a replay does not insert a second
    row. Do not force a live decline against a real customer.

## Abort

If PayPal shows a second overlapping subscription, cancel the extra one in
PayPal immediately and file a billing incident. DropIMG checkout is supposed
to 409 rather than mint a second live row. Plan change must revise the
existing `I-…`.

## After success

Comment on KON-82 with the PayPal `I-…` (not secrets), webhook event ids, and
D1 row checks, then move it to Done.
