# R2 lifecycle

D1 `images.expires_at` is authoritative and the every-5-minutes cron does the
real deleting. These bucket rules only sweep up objects the cron never reached.

Do not put a 2-day expire on the whole `o/` prefix. That would delete 7-day and
Pro objects.

| Prefix | Days | Seconds | Who |
|--------|------|---------|-----|
| `o/24h/` | 2 | 172800 | Anonymous + Free choosing 1 hour or 24 hours |
| `o/7d/` | 10 | 864000 | Anonymous + Free choosing 7 days |
| `o/pro/` | 100 | 8640000 | All Pro uploads, and anything extended |

Each rule is comfortably longer than the longest lifetime its prefix can hold,
so a delayed cron run never races the bucket.

## Why Pro objects skip the short prefixes

A Pro upload lands in `o/pro/` even when the owner picks 1 hour, because they can
extend it later and copying an object costs far more than parking it under the
long rule from the start. `r2ClassFor()` in `src/lib/entitlements.ts` is the one
place that decides this.

## Extending across a lifecycle boundary

A Free or anonymous object can be claimed and then extended by a Pro owner. Its
key still sits under a short bucket rule, so `moveImageToProPrefix()` runs first:
copy to `o/pro/`, verify with a `head`, repoint `images.r2_key`, then delete the
old object. Only after that move succeeds may `expires_at` grow. Writing the
longer lifetime first would leave the database promising an image the bucket is
about to delete.

## Applying rules

PUT `/accounts/{account_id}/r2/buckets/{bucket}/lifecycle` replaces the full rule
set. Keep the default multipart-abort rule and never leave a 2-day delete on `o/`.

Staging carries all three prefix rules and has `LONG_TTL_ENABLED=true`.

## Production, not yet done

Production still has the old `o/` 2-day rule and `LONG_TTL_ENABLED=false`. Before
production can enable long TTL, its bucket needs the same three prefix rules
applied and read back. That is a launch-phase task, not a design-phase one.
