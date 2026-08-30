# Phase H — production launch runbook

Return point: tag `v2-pre-production` (`2993fe3`). Every step below is either
reversible by flipping one variable and redeploying, or is additive to data.

Production today, read back on the day this was written:

| Thing | State |
|-------|-------|
| D1 `dropimg` | 5 migrations pending (`0003`–`0007`) |
| R2 `dropimg-images` | one blanket rule, `o/` expire after 2 days |
| Secrets | `ADMIN_TOKEN`, `INDEXNOW_KEY`, `IP_HASH_SECRET` |
| Paddle config | none — no `PADDLE_*` var or secret exists on `env.production` |
| Gates | `BILLING_ENABLED`, `LONG_TTL_ENABLED`, `PRO_50MB_ENABLED`, `UGC_SHARE_ADS_ENABLED` all false |

## Before step 1: the Paddle live account

This is the only prerequisite that cannot be done from this repo, and steps 5
onward are blocked on it. In the **live** Paddle dashboard:

1. Create the DropIMG Pro product and two prices: `$2.99` monthly, `$24.99`
   annual. Live prices are separate objects from the sandbox ones; their IDs go
   into `env.production.vars`.
2. Set the default payment link to `https://dropimg.io/pro`. Without it,
   checkout 400s with `transaction_default_checkout_url_not_set`, and it cannot
   be set through the API.
3. Approve `dropimg.io` as a checkout domain.
4. Add the webhook destination `https://dropimg.io/api/billing/paddle/webhook`
   and keep its signing secret.
5. Generate a live API key and note the live client-side token.

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

Add to `env.production.vars` in `wrangler.jsonc`: `PADDLE_ENV=live`,
`PADDLE_CLIENT_TOKEN`, `PADDLE_PRICE_MONTHLY`, `PADDLE_PRICE_ANNUAL`. This also
clears the existing warning that `PADDLE_ENV` sits at the top level where
production does not inherit it. Then:

```bash
npx wrangler secret put PADDLE_API_KEY --env production
npx wrangler secret put PADDLE_WEBHOOK_SECRET --env production
```

Set `BILLING_ENABLED=true` and deploy. Verify `/api/billing/config` reports
`live` with the two live price IDs, the overlay opens, and a webhook with a bad
signature is rejected.

## Step 6 — one real purchase

Buy annual with a real card on `https://dropimg.io/pro`. Confirm Pro is granted
only after the verified webhook, that `pro_activated` is recorded, that My drops
and `/app/billing` show the subscription, and that the customer portal opens.
Then decide explicitly whether to keep or refund the transaction.

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
