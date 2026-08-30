# Stripe (Managed Payments)

Billing runs on **Stripe Managed Payments**, so Stripe is the merchant of
record and handles sales tax, VAT and GST in 80+ countries, fraud, disputes and
transaction-level support. Customers buy from Stripe under its **Link** brand:
receipts come from Link, and the charge reads `LINK.COM* DROPIMG` on a
statement. Our legal pages say so, because that mismatch is otherwise a
chargeback waiting to happen.

We moved here from Paddle, which rejected the account on the grounds that
DropIMG is a filesharing service. Stripe lists "cyberlocker and file-sharing
services" as a restricted business needing written pre-approval, but Managed
Payments explicitly supports "electronically supplied business and web
services", and DropIMG Pro is sold under a SaaS tax code. Confirm the category
with Stripe before taking live payments.

## Test catalog

- Product `prod_VAX5xiQSjTfSjN` — DropIMG Pro, tax code `txcd_10103000` (SaaS, personal use)
- Monthly `price_1UAC0uAyXaIAfjNQgHrpar8s` — €2.99 / month, `lookup_key=dropimg_pro_monthly`
- Annual `price_1UAC0vAyXaIAfjNQRRE1SSkA` — €24.99 / year, `lookup_key=dropimg_pro_annual`
- Webhook endpoint `we_1UAC1EAyXaIAfjNQLiKLdOfR` → staging, pinned to `2025-03-31.basil`

Both price IDs are already in `env.staging.vars`. Staging additionally needs
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as secrets; the endpoint's
signing secret is on its page in the Stripe dashboard.

```bash
npx wrangler secret put STRIPE_SECRET_KEY --env staging      # sk_test_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging  # whsec_…
```

Prices are **tax inclusive**, so €2.99 is what the customer pays rather than a
base that VAT is added to. Adaptive Pricing is on by default under Managed
Payments, so most buyers are quoted their own currency, converted from the EUR
base and shown before they pay. Stripe prices are immutable amounts: changing
what we charge means new price IDs, and whenever `PRO_COPY` changes a displayed
amount the catalog has to move with it. The site must never advertise one price
and charge another.

The live catalog does not exist yet. It gets created, with the same tax code
and tax behaviour, once the account is activated.

## Constraints that shaped the integration

Managed Payments only runs on Checkout and Payment Links. Elements and
embedded components are unsupported, so checkout is a **hosted redirect** to
`checkout.stripe.com` rather than the overlay Paddle used, and custom domains
are not available on that page. Subscriptions also cannot be created outside
Checkout, so there is no server-side path to granting Pro without a payment.

The API version is pinned to `2025-03-31.basil` in both the client and the
registered webhook endpoint. Managed Payments requires basil or later, and
basil is where subscription billing periods moved from the subscription onto
its items — `items.data[].current_period_end`, not `current_period_end`.

## Flow

`POST /api/billing/checkout` mints a session server-side and returns its URL;
the browser navigates there. Both the success and cancel legs return to `/pro`,
which polls `/api/account/me` until the entitlement flips rather than assuming
the webhook has landed.

The user id rides on both the session (`client_reference_id` and `metadata`)
and the subscription (`subscription_data[metadata]`), because
`checkout.session.completed` and `customer.subscription.created` race and
whichever arrives first has to be able to name the account on its own.

Pro is granted only from a verified webhook at
`POST /api/billing/stripe/webhook`. The signature is HMAC-SHA256 of
`timestamp.rawBody`, compared against every `v1` in the header so a rotated
secret keeps verifying, within Stripe's 300s tolerance.

Subscribed events: `checkout.session.completed`,
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`.

## Customer-facing checkout states

- Opening checkout…
- Payment received. Activating Pro… (back from Stripe, entitlements still Free)
- Your payment was received. Pro is still activating. Refresh My drops in a moment. (poll timeout)
- Billing isn’t available right now. (flags off or config missing)

Do not say payment succeeded on frontend state alone, and never grant Pro from it.

## Configuration

Test and live are told apart by the `STRIPE_SECRET_KEY` prefix, so there is no
separate environment variable that can disagree with the key. An unrecognised
prefix disables billing rather than guessing which account would be charged.

For local webhooks use the secret printed by
`stripe listen --forward-to localhost:5173/api/billing/stripe/webhook`, not the
one registered against the deployed endpoint.

Production keeps `BILLING_ENABLED=false` until the account is activated and the
live catalog exists. See [pro.md](pro.md).
