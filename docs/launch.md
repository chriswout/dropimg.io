# Phase H — production launch runbook

Return point: tag `v2-pre-production` (`2993fe3`). Every step below is either
reversible by flipping one variable and redeploying, or is additive to data.

Progress:

| Step | State |
|------|-------|
| 1 snapshot | done — `.backup/prod-20260830-1116.sql`, 2 tables, 21 rows |
| 2 migrate | done — `0003`–`0007` applied, none pending |
| 3 R2 | done — three prefix rules applied and read back |
| 4 deploy dark | done — all gates off, V1 behaviour verified live |
| 5 billing | rebuilt on Stripe; test mode works, blocked on account activation |
| 6 first purchase | blocked on the same |
| 7 lifecycle | done — `LONG_TTL_ENABLED=true`, brought forward past the billing block |
| 8 `PRO_50MB_ENABLED` | waiting: it only affects Pro accounts, and there are none yet |
| 9 final smoke | after billing |

Deployed version: `6b56cff8-6e50-4f6d-9e78-3fd557a64d47`.

Step 7 was taken out of order deliberately. Its only prerequisite is the R2
lifecycle from step 3, not billing, and leaving it dark would have held the
free-tier lifecycle behind a third-party verification queue.

Production before step 1, for reference: five pending migrations, a single
blanket `o/` 2-day R2 rule, secrets limited to `ADMIN_TOKEN`, `INDEXNOW_KEY`
and `IP_HASH_SECRET`, and no billing var or secret of any kind.

## Why billing was rebuilt mid-launch

Paddle rejected the account, classifying DropIMG as a filesharing service.
Everything Paddle-shaped was removed and rebuilt on **Stripe Managed
Payments**, which keeps a merchant of record — so tax, fraud, disputes and
transaction support stay off our plate — while running on Stripe's own
infrastructure. See [stripe.md](stripe.md) for the integration.

The category question did not disappear with the provider. Stripe also lists
"cyberlocker and file-sharing services" as a restricted business needing
written pre-approval, and has closed accounts over it. Managed Payments does
explicitly support "electronically supplied business and web services", and
DropIMG Pro is sold under a SaaS tax code, which is a much better fit than
Paddle's read. **Get that confirmed in writing before taking live payments**,
because being shut down after launch with a balance held is worse than being
rejected before it.

The compliance work done for Paddle's domain review all still applies and all
still stands: the homepage and `/pro` are public with prices visible to
anonymous visitors, and `/terms`, `/privacy`, `/refunds` and `/contact` return
200 without authentication. The merchant-of-record wording in those pages now
names Stripe and Link.

## The Stripe account

Netherlands, EUR, `acct_1UABoeAyXaIAfjNQ`. Test mode is working end to end;
`charges_enabled`, `payouts_enabled` and `details_submitted` are all still
false, so live mode does not exist yet.

| Thing | Test ID |
|-------|---------|
| Product `DropIMG Pro`, `txcd_10103000` | `prod_VAX5xiQSjTfSjN` |
| Monthly, €2.99 EUR, tax inclusive | `price_1UAC0uAyXaIAfjNQgHrpar8s` |
| Annual, €24.99 EUR, tax inclusive | `price_1UAC0vAyXaIAfjNQRRE1SSkA` |
| Webhook endpoint → staging, `2025-03-31.basil` | `we_1UAC1EAyXaIAfjNQLiKLdOfR` |

In the dashboard, in this order:

1. Complete account activation: business details, bank account, identity.
2. Accept the **Managed Payments** terms of service and activate it. A
   Checkout Session with `managed_payments[enabled]=true` already succeeds in
   test, so the entitlement is present, but live needs the terms accepted.
3. Set the custom terms of service and privacy policy URLs under Checkout
   settings to `https://dropimg.io/terms` and `https://dropimg.io/privacy`, so
   they appear in the Checkout footer.
4. Recreate the catalog in live mode with the same tax code and tax behaviour,
   and put the live price IDs into `env.production.vars`.
5. Register the live webhook endpoint and set `STRIPE_WEBHOOK_SECRET`.

Apple Pay needs no domain association file here: Managed Payments checkouts are
hosted on `checkout.stripe.com`, which Stripe verifies itself. The Paddle file
under `/.well-known/` is now inert and can be deleted whenever convenient.

## Step 1 — snapshot

```bash
npx wrangler d1 export dropimg --remote --env production --output ".backup/prod-$(date +%Y%m%d-%H%M).sql"
```

R2 needs no snapshot: nothing in this launch deletes or rewrites existing
objects, and step 3 only changes which sweep rule covers them.

## Step 2 — migrate

```bash
npm run db:migrate:production
npx wrangler d1 migrations list dropimg --remote --env production   # expect none pending
```

All five migrations are additive (accounts, subscriptions, upload intents,
password params). The deployed V1 Worker ignores the new tables, so this is safe
to run before the new code ships.

## Step 3 — configure R2 (prerequisite for step 7)

Replace the blanket rule with the three lifecycle classes, then read them back:

| Prefix | Expire after |
|--------|--------------|
| `o/24h/` | 2 days |
| `o/7d/` | 10 days |
| `o/pro/` | 100 days |

Keep the default multipart-abort rule. Nothing is orphaned by dropping the `o/`
rule: every key this codebase has ever written already begins with a class
segment, and everything production holds today is a `o/24h/` object with a
lifetime under 24 hours, which the new 2-day rule still covers.

`LONG_TTL_ENABLED` must not be turned on until this step is applied **and read
back**. See [r2-lifecycle.md](r2-lifecycle.md).

## Step 4 — deploy dark

```bash
npm run deploy:production
```

All four gates stay false, so this ships the new code running V1 behaviour.
Verify before going further:

- anonymous upload returns a 24-hour link, and the uploader shows no expiry selector
- share page, direct `/i/…` URL, and the delete link all work
- `/pro` renders with billing off and no purchase CTA
- cron still expires images on schedule
- `/health` is green and the tail is quiet

## Step 5 — enable billing

Once the live catalog exists, put both live price IDs into
`env.production.vars` and set the two secrets:

```bash
npx wrangler secret put STRIPE_SECRET_KEY --env production      # sk_live_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production  # whsec_…
```

Set `BILLING_ENABLED=true` and deploy. Verify `/api/billing/config` reports
`live` with the two live price IDs, that the CTA redirects to
`checkout.stripe.com`, and that a webhook with a bad signature is rejected.

There is no separate environment variable to set: the mode is read off the
secret key prefix, so a test key in production disables billing rather than
silently charging against the wrong account.

## Step 6 — one real purchase

Buy annual with a real card on `https://dropimg.io/pro`. Confirm Pro is granted
only after the verified webhook, that `pro_activated` is recorded, that My drops
and `/app/billing` show the subscription, and that the customer portal opens.
Check the charge descriptor reads `LINK.COM*`, matching what `/refunds` and
`/terms` tell buyers to expect. Then decide explicitly whether to keep or
refund the transaction.

## Step 7 — enable the lifecycle

Only after step 3 is applied and read back. Set `LONG_TTL_ENABLED=true` and
deploy. Verify: anonymous 1h / 24h / 7d with 7 days default, Pro 30d and 90d,
each landing under the right prefix, extend refusing to pass
`created_at + 90 days`, and a claimed Free object moving to `o/pro/` before its
lifetime grows.

## Step 8 — enable 50 MB

Set `PRO_50MB_ENABLED=true` and deploy. Upload a real 50 MB image as a Pro
account and watch memory and duration in the tail.

## Step 9 — final smoke, then GO

Anonymous, Free and Pro upload paths; password-protected share; extension and
ShareX; My drops extend; abuse report and admin removal; sitemap and the intent
pages; cron.

## Rollback

Each gate is one variable and a deploy. If the code itself is wrong, redeploy
from `v2-pre-production`. Data is additive throughout, so a rollback never needs
the D1 snapshot — it exists for the case nobody plans for.

## Deliberately not in this phase

Ads stay off (`UGC_SHARE_ADS_ENABLED=false`), so the moderation state machine in
[moderation.md](moderation.md) stays adjacent to launch rather than inside it.
No paid acquisition until that lands.
