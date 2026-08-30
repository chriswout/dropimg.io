# R2 lifecycle

Do not put a 2-day expire on the whole `o/` prefix. That would delete Pro objects.

| Prefix | Days | Seconds | Who |
|--------|------|---------|-----|
| `o/24h/` | 2 | 172800 | Anonymous + Free |
| `o/pro/` | 35 | 3024000 | All new Pro uploads |

PUT `/accounts/{account_id}/r2/buckets/{bucket}/lifecycle` replaces the full rule set. Keep the default multipart-abort rule and never leave a 2-day delete on `o/`.

Staging lists both prefix rules and has `LONG_TTL_ENABLED=true`. Production still has the old `o/` 2-day rule — do not enable long TTL there until that bucket is narrowed the same way.
