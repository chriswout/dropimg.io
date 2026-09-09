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
| 5 billing | live PayPal REST Subscriptions; `BILLING_ENABLED=true` |
| 6 first purchase | ready — first live charge still to confirm |
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
That stack was rebuilt on Stripe Managed Payments, which Stripe then
declined for the same restricted category. Billing now runs on **PayPal REST
Subscriptions**. DropIMG is the merchant of record; PayPal is the processor.
See [paypal.md](paypal.md) for the integration.

The category question did not disappear. Confirm with PayPal that temporary
image hosting is allowed **before the first live charge**. Being shut down
after launch with a balance held is worse than being rejected before it. The
category brief we prepared for Stripe is in
[stripe-underwriting.md](stripe-underwriting.md).

The compliance work done for Paddle's domain review all still applies and all
still stands: the homepage and `/pro` are public with prices visible to
anonymous visitors, and `/terms`, `/privacy`, `/refunds` and `/contact` return
200 without authentication. Those pages now name DropIMG as merchant of
record and PayPal as the processor.

## The PayPal catalog

Use the REST-API-integratie app (not shopping-cart, Braintree, or NVP/SOAP).
Sandbox first, then live. Product **DropIMG Pro**, monthly €2.99 and annual
€24.99, tax inclusive. Webhook to `/api/billing/paypal/webhook`. Steps and
env vars are in [paypal.md](paypal.md).

The live catalog does not exist yet. Production keeps `BILLING_ENABLED=false`
until it does.

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
| `o/30d/` | 35 days |
| `o/pro/` | 190 days |

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

Once the live REST app and catalog exist, put `PAYPAL_ENV=live` and both
live plan IDs into `env.production.vars` and set the secrets:

```bash
npx wrangler secret put PAYPAL_CLIENT_ID --env production
npx wrangler secret put PAYPAL_CLIENT_SECRET --env production
npx wrangler secret put PAYPAL_WEBHOOK_ID --env production
```

Set `BILLING_ENABLED=true` and deploy. Verify `/api/billing/config` reports
`live` with the two live plan IDs, that the CTA redirects to PayPal, and
that a webhook with a bad signature is rejected.

Mode is `PAYPAL_ENV` (`sandbox` or `live`), which also picks the API host, so
a sandbox env in production disables billing rather than charging the wrong
account.

## Step 6 — one real purchase

Buy annual with a real PayPal account on `https://dropimg.io/pro`. Confirm Pro
is granted only after the verified webhook, that `pro_activated` is recorded,
that My drops and `/app/billing` show the subscription, and that Manage
billing opens the PayPal wallet. Check the statement descriptor matches what
`/refunds` and `/terms` tell buyers to expect. Then decide explicitly whether
to keep or refund the transaction.

## Step 7 — enable the lifecycle

Only after step 3 is applied and read back. Set `LONG_TTL_ENABLED=true` and
deploy. Verify: anonymous 1h / 24h / 7d / 30d with 7 days default, Pro 90d and
180d, each landing under the right prefix, extend refusing to pass
`created_at + 180 days`, and a claimed Free object moving to `o/pro/` before its
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
