# PayPal REST Subscriptions

**LIVE SUBSCRIPTION BILLING = PAYPAL.** Paddle and Stripe are not live
processors. See [AGENTS.md](../AGENTS.md).

Billing runs on **PayPal REST Subscriptions** (the middle card on PayPal’s
credentials screen: *REST-API-integratie*). DropIMG is the **merchant of
record**. PayPal is the processor: it collects the payment and holds the
payment method. Tax, receipts, and refunds are ours.

Two catalogs, never mixed:

| Product | Checkout | Advertised totals (tax inclusive) |
|---------|----------|-----------------------------------|
| Drops Pro | `POST /api/billing/checkout` | €2.99 / month, €24.99 / year |
| Web Assets | `POST /api/billing/web-assets/checkout` | Developer $9 / $90, Pro $29 / $290 |

Paddle and Stripe both declined the same filesharing / cyberlocker category.
The earlier Stripe write-up is archival: [stripe-underwriting.md](stripe-underwriting.md).

Do not use shopping-cart, Braintree, NVP/SOAP, Paddle, or Stripe.

## Dashboard setup

Do this in [PayPal Developer](https://developer.paypal.com/) for a **Sandbox**
app first, then again for **Live**.

1. Create a REST API app. Copy the client id and secret.
2. Catalog: one Product **DropIMG Pro**, two Billing Plans — monthly €2.99 and
   annual €24.99, same amounts as this site advertises. Plan IDs look like
   `P-…`.
3. Webhook URL:
   - staging: `https://<staging-host>/api/billing/paypal/webhook`
   - production: `https://dropimg.io/api/billing/paypal/webhook`
4. Subscribe at least:

   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`

   Optional for observability only (does not change entitlements):

   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`

Copy the webhook id (`WH-…` / dashboard id) as `PAYPAL_WEBHOOK_ID`.

The live catalog does not exist until you create it. Production keeps
`BILLING_ENABLED=false` until then.

## Sandbox catalog

Created via the Catalog Products + Billing Plans APIs against the sandbox REST
app. Amounts match the site: €2.99 / month and €24.99 / year, tax included.

| Thing | Sandbox ID |
|-------|------------|
| Product `DropIMG Pro` | `PROD-5GH42001BN614613L` |
| Monthly, €2.99 EUR | `P-15G50054531033903NKPD7ZI` |
| Annual, €24.99 EUR | `P-7F863114YW191224BNKPD7ZQ` |

### Sandbox Web Assets (USD)

Distinct product from Drop Pro. Created 2026-09-17.

| Thing | Sandbox ID |
|-------|------------|
| Product `DropIMG Web Assets` | `PROD-5XM483746R8533505` |
| Developer monthly, $9 | `P-8LH706826P153202CNKV6BCI` |
| Developer annual, $90 | `P-8VU25673PE447042MNKV6BCQ` |
| Pro monthly, $29 | `P-3JV643758U3795743NKV6BCQ` |
| Pro annual, $290 | `P-6M302061UF3384325NKV6BCY` |

Both Drop Pro plan IDs are in `env.staging.vars` and local `.dev.vars`. Staging still
needs `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` as
secrets.

## Live catalog

Same Drop Pro product and amounts, created against the live REST app.

| Thing | Live ID |
|-------|---------|
| Product `DropIMG Pro` | `PROD-43L00098RY122601R` |
| Monthly, €2.99 EUR | `P-3RL00862KD8203139NKPLFSI` |
| Annual, €24.99 EUR | `P-9RD66268708840634NKPLFSQ` |
| Webhook → `https://dropimg.io/api/billing/paypal/webhook` | `5MS36084EP647103P` |

### Live Web Assets (USD)

| Thing | Live ID |
|-------|---------|
| Product `DropIMG Web Assets` | `PROD-8JG73073F0622273B` |
| Developer monthly, $9 | `P-65K96128FP9176350NKV6BLQ` |
| Developer annual, $90 | `P-09529537J9964681BNKV6BLQ` |
| Pro monthly, $29 | `P-0B2063130F924444DNKV6BLQ` |
| Pro annual, $290 | `P-8GN492717K657513VNKV6BLQ` |

## Configuration

| Kind | Name | Notes |
|------|------|--------|
| secret | `PAYPAL_CLIENT_ID` | REST app client id |
| secret | `PAYPAL_CLIENT_SECRET` | REST app secret |
| secret | `PAYPAL_WEBHOOK_ID` | Dashboard webhook id for `verify-webhook-signature` |
| var | `PAYPAL_ENV` | `sandbox` or `live` only — picks the API host |
| var | `PAYPAL_PLAN_MONTHLY` | Drop Pro plan id `P-…` |
| var | `PAYPAL_PLAN_ANNUAL` | Drop Pro plan id `P-…` |
| var | `PAYPAL_WA_DEVELOPER_MONTHLY` | Web Assets Developer $9 |
| var | `PAYPAL_WA_DEVELOPER_ANNUAL` | Web Assets Developer $90 |
| var | `PAYPAL_WA_PRO_MONTHLY` | Web Assets Pro $29 |
| var | `PAYPAL_WA_PRO_ANNUAL` | Web Assets Pro $290 |
| var | `BILLING_ENABLED` | `"true"` to open checkout |

`sandbox` talks to `https://api-m.sandbox.paypal.com`. `live` talks to
`https://api-m.paypal.com`. Any other value (or a missing env) disables
billing rather than guessing which account would be charged — same idea as
refusing a Stripe key that was neither `sk_test_` nor `sk_live_`.

```bash
npx wrangler secret put PAYPAL_CLIENT_ID --env staging
npx wrangler secret put PAYPAL_CLIENT_SECRET --env staging
npx wrangler secret put PAYPAL_WEBHOOK_ID --env staging
```

Put the two plan ids and `PAYPAL_ENV=sandbox` in `env.staging.vars`. Repeat
for production with `PAYPAL_ENV=live` once the live app and catalog exist.

For local webhook work, integration tests (and only tests) can set
`PAYPAL_WEBHOOK_SECRET` and omit `PAYPAL_WEBHOOK_ID`. That path accepts an
HMAC `PayPal-Signature: t=…,v1=…` header so the suite does not call PayPal.
Production must set `PAYPAL_WEBHOOK_ID` and never rely on the HMAC secret.

## Flow

`POST /api/billing/checkout` and `POST /api/billing/web-assets/checkout` refuse
anonymous buyers. Before minting a PayPal `I-…`, the Worker inserts an
`approval_pending` reservation row. A second click, an already-live
subscription, or a canceled-but-still-paid-through row returns **409** and
does not call PayPal.

- Drops Pro: `already_subscribed` or `checkout_in_progress`
- Web Assets: `plan_change_blocked` or `checkout_in_progress`

Launch does **not** start a second Web Assets subscription to “change plan”.
There is no PayPal proration or invented credit. Cancel renewal in PayPal, keep
access until `current_period_end`, then subscribe to the new plan.

`custom_id = userId`. The browser is sent to the `rel=approve` URL. Success
pages may sync the mint we created; they never grant entitlement by themselves.

Entitlement is granted only from a **verified** webhook at
`POST /api/billing/paypal/webhook`. Production verification is PayPal’s
`verify-webhook-signature` API. Unsigned JSON is rejected. Replay is
idempotent via `billing_events(provider, event_id)`.

Unknown PayPal `plan_id` values fail closed: no `subscriptions` upsert, no
entitlement. Drops Pro plan IDs cannot grant Web Assets, and the reverse is
also true. Overlapping catalog IDs disable checkout.

`provider` on `subscriptions` is `paypal`. `provider_subscription_id` is the
PayPal `I-…`. `product` is `drops_pro` or `web_assets`.

**Manage in PayPal** opens the PayPal wallet (`/myaccount/autopay`). There is
no in-app invoice list and no DropIMG customer portal. Account deletion cancels
every live PayPal row (both products) before the user is tombstoned.

## Cancellation and paid-through access

PayPal `BILLING.SUBSCRIPTION.CANCELLED` maps to `canceled`. If the event omits
`billing_info.next_billing_time`, DropIMG keeps the previously stored
`current_period_end`. `isProSubscription` (and Web Assets paid mapping) stay
true until that timestamp. `BILLING.SUBSCRIPTION.EXPIRED` maps to `expired` and
does not grant access.

Account deletion is different: it cancels the PayPal subscription immediately
and closes the account.

## Failed payments

PayPal retry exhaustion typically yields `SUSPENDED`. Suspended rows do **not**
grant Drops Pro or a paid Web Assets plan. There is no `past_due` mapping and
no dunning email. `BILLING.SUBSCRIPTION.PAYMENT.FAILED`, if subscribed, is
recorded for observability and does not change entitlement by itself. The
billing UI must not claim retries DropIMG does not perform. Update the payment
method in PayPal.

## Customer-facing checkout states

- Opening PayPal…
- Payment received. Activating Pro… (back from PayPal, entitlements still Free)
- Your payment was received. Pro is still activating. Refresh My drops in a moment. (poll timeout)
- You already have Drops Pro. Manage it in PayPal. (409)
- You already have a live Web Assets subscription… (409)
- Billing isn’t available right now. (flags off or config missing)

Do not say payment succeeded on frontend state alone, and never grant Pro from it.

Controlled live Web Assets purchase walkthrough (do not auto-charge):
[web-assets-live-checkout.md](web-assets-live-checkout.md).

## What we will not do

- Braintree, NVP/SOAP, Paddle, or a second Stripe path
- Anonymous PayPal charges
- Fake proration, account credits, or a second overlapping paid subscription
- In-app invoice history or a custom billing portal
- Changing advertised prices or mixing Drops Pro with Web Assets SKUs
