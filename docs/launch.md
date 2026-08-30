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
| 5 billing | config complete; blocked on Paddle enabling checkouts for the account |
| 6 first purchase | blocked on the same |
| 7 lifecycle | done — `LONG_TTL_ENABLED=true`, brought forward past the Paddle block |
| 8 `PRO_50MB_ENABLED` | waiting: it only affects Pro accounts, and there are none yet |
| 9 final smoke | after billing |

Deployed version: `6b56cff8-6e50-4f6d-9e78-3fd557a64d47`.

Step 7 was taken out of order deliberately. Its only prerequisite is the R2
lifecycle from step 3, not billing, and leaving it dark would have held the
free-tier lifecycle behind a third-party verification queue.

Production before step 1, for reference: five pending migrations, a single
blanket `o/` 2-day R2 rule, secrets limited to `ADMIN_TOKEN`, `INDEXNOW_KEY`
and `IP_HASH_SECRET`, and no `PADDLE_*` var or secret of any kind.

## The Paddle live account

Created through the live MCP, which needed write permission granted under
**Paddle > Connectors > MCP** first:

| Thing | ID |
|-------|----|
| Product `DropIMG Pro`, `saas` | `pro_01m19mj6khd0v39ysxqny66w9q` |
| Monthly, $2.99 USD | `pri_01m19mj6phqctcwdhfxkw7hq2w` |
| Annual, $24.99 USD | `pri_01m19mj6sx9xsqaj2g97qwhyg8` |
| Client-side token | `ctkn_01m19mjktf36gc8j7831m7pavg` |
| Webhook destination | `ntfset_01m19mjkzz7fxkbcch392fwbpb` |

A US pricing preview reads back `$2.99` and `$24.99`, so Paddle charges what
the site advertises. The webhook is subscribed to the nine events the handler
acts on, and its signing secret is already the `PADDLE_WEBHOOK_SECRET` secret
on `env.production`.

`PADDLE_API_KEY` is set as a production secret.

**Checkouts are not enabled on the account yet.** Creating a live transaction
returns "Checkouts aren't enabled for this account. This typically means that
you haven't fully completed the Paddle onboarding process." Until Paddle
finishes verifying the account, no live checkout can open and no real purchase
can be made, so steps 5 and 6 cannot proceed regardless of what this repo does.

Once Paddle approves the account:

1. Set **the default payment link** to `https://dropimg.io/pro`. Without it
   checkout 400s with `transaction_default_checkout_url_not_set`, and it cannot
   be set through the API.
2. Confirm `dropimg.io` is approved as a checkout domain.
3. Re-run the throwaway-transaction check to confirm a checkout URL is issued
   before exposing a purchase button.

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

`env.production.vars` now carries `PADDLE_ENV=live`, the client token and both
price IDs, and `PADDLE_WEBHOOK_SECRET` is set. All that is left is the key:

```bash
npx wrangler secret put PADDLE_API_KEY --env production
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
