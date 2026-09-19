# Agent notes

**LIVE SUBSCRIPTION BILLING = PAYPAL REST SUBSCRIPTIONS.**

- PayPal is the only live subscription processor.
- Paddle and Stripe are **not** part of the live billing path.
- `.agents/skills/paddle-*` and `docs/stripe-underwriting.md` are archival / reference-only. Do not follow them for DropIMG.
- Do not migrate processors. `/app/billing` is the first-party PayPal-backed portal (plans, deferred revisions, cancel renewal, payment history). Do not add a Stripe Customer Portal, a second processor, in-app invoices, proration, or credits.
- Dunning and payment receipts are first-party email via the Cloudflare EMAIL binding (`signin@dropimg.io`). Do not add a Stripe invoice product.

Two catalogs must never mix SKUs or entitlements:

| Product | Checkout | Prices |
|---------|----------|--------|
| Drops Pro (`drops_pro`) | `POST /api/billing/checkout` | €2.99/month, €24.99/year |
| Web Assets (`web_assets`) | `POST /api/billing/web-assets/checkout` | Developer $9/$90, Pro $29/$290 |

Entitlements come from verified PayPal webhooks and the `subscriptions` row, not from the return URL. See [docs/paypal.md](docs/paypal.md).
