# PayPal REST Subscriptions

Billing runs on **PayPal REST Subscriptions** (the middle card on PayPal’s
credentials screen: *REST-API-integratie*). DropIMG is the **merchant of
record**. PayPal is the processor: it collects the payment and holds the
payment method. Tax, receipts, and refunds are ours. Advertised totals stay
**€2.99 / month** and **€24.99 / year**, tax inclusive, same as before.

Paddle and Stripe both declined the same filesharing / cyberlocker category.
Confirm with PayPal that temporary image hosting is allowed **before the first
live charge**. They can decline this category too. The earlier Stripe write-up
is in [stripe-underwriting.md](stripe-underwriting.md).

Do not use shopping-cart, Braintree, or NVP/SOAP.

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

Both plan IDs are in `env.staging.vars` and local `.dev.vars`. Staging still
needs `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` as
secrets.

## Live catalog

Same product and amounts, created against the live REST app.

| Thing | Live ID |
|-------|---------|
| Product `DropIMG Pro` | `PROD-43L00098RY122601R` |
| Monthly, €2.99 EUR | `P-3RL00862KD8203139NKPLFSI` |
| Annual, €24.99 EUR | `P-9RD66268708840634NKPLFSQ` |
| Webhook → `https://dropimg.io/api/billing/paypal/webhook` | `5MS36084EP647103P` |

## Configuration

| Kind | Name | Notes |
|------|------|--------|
| secret | `PAYPAL_CLIENT_ID` | REST app client id |
| secret | `PAYPAL_CLIENT_SECRET` | REST app secret |
| secret | `PAYPAL_WEBHOOK_ID` | Dashboard webhook id for `verify-webhook-signature` |
| var | `PAYPAL_ENV` | `sandbox` or `live` only — picks the API host |
| var | `PAYPAL_PLAN_MONTHLY` | Plan id `P-…` |
| var | `PAYPAL_PLAN_ANNUAL` | Plan id `P-…` |
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

`POST /api/billing/checkout` creates a PayPal subscription with
`custom_id = userId` and returns the `rel=approve` URL. The browser navigates
there. Success and cancel both return to `/pro`, which polls
`/api/account/me` until the entitlement flips.

Pro is granted only from a verified webhook at
`POST /api/billing/paypal/webhook`. Production verification is PayPal’s
`verify-webhook-signature` API. Unsigned JSON is rejected.

`provider` on `subscriptions` is `paypal`. `provider_subscription_id` is the
PayPal `I-…`. `provider_customer_id` is the payer / subscriber id.

PayPal has no Stripe Customer Portal. **Manage billing** opens the PayPal
wallet (`/myaccount/autopay`). Account deletion cancels the live subscription
immediately via the Subscriptions API before the user row is tombstoned.

## Customer-facing checkout states

- Opening PayPal…
- Payment received. Activating Pro… (back from PayPal, entitlements still Free)
- Your payment was received. Pro is still activating. Refresh My drops in a moment. (poll timeout)
- Billing isn’t available right now. (flags off or config missing)

Do not say payment succeeded on frontend state alone, and never grant Pro from it.

## What we will not do

- Braintree, NVP/SOAP, or a second Stripe path
- Anonymous PayPal charges
- Changing Pro prices or entitlements
