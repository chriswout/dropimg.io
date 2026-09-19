# KON-82 — Controlled live Web Assets PayPal purchase

**Do not mark KON-82 Done until this walkthrough has been completed with a
real production charge by a human.** Agents must not start a live payment.

Lowest-risk live paid plan: **Web Assets Developer monthly ($9)**.

Use a dedicated DropIMG account you control. Do not use a customer account.

## Before you start

1. Confirm production `PAYPAL_ENV=live`, `BILLING_ENABLED=true`.
2. Confirm live plan IDs in production vars match [paypal.md](paypal.md) and
   have not been swapped with sandbox IDs.
3. Confirm the live webhook destination is
   `https://dropimg.io/api/billing/paypal/webhook` with signature verification
   via `PAYPAL_WEBHOOK_ID`.
4. Sign in to Cloudflare and PayPal dashboards so you can read D1,
   `billing_events`, and the PayPal subscription.

## Walkthrough

1. Sign in on https://dropimg.io with the controlled test account.
2. Confirm `/app/billing` shows **Web Assets Free**.
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
   `duplicate: true` and not create a second subscription row.
9. Confirm `subscriptions.product = 'web_assets'` (never `drops_pro`).
10. Confirm `price_id` is the live Developer monthly plan id
    `P-65K96128FP9176350NKV6BLQ`.
11. Confirm `/api/account/me` `webAssets.plan` is `developer`.
12. Confirm `/app/billing` shows **Web Assets Developer — $9/month** and
    **Manage in PayPal** (not a fake invoice list).
13. Create or inspect a project: Developer limits apply (20 projects, 10 GB,
    20 keys, 2M monthly `/m/…` deliveries). Existing public `/m/…` aliases
    must keep working.
14. Hit a public `/m/…` URL and confirm it still 200s.
15. Cancel **renewal** from PayPal (wallet / Manage in PayPal). Do not delete
    the DropIMG account.
16. Confirm the subscription row is `canceled` with `current_period_end` still
    in the future, and Developer entitlements remain until that timestamp.
17. After `current_period_end` (or a sandbox clock equivalent), confirm the
    account is Web Assets Free again. Existing `/m/…` aliases must still
    resolve; new projects/uploads/keys must respect Free caps.

## Abort

If PayPal shows a second overlapping subscription, cancel the extra one in
PayPal immediately and file a billing incident. DropIMG checkout is supposed
to 409 rather than mint a second live row.

## After success

Comment on KON-82 with the PayPal `I-…` (not secrets), webhook event ids, and
D1 row checks, then move it to Done.
