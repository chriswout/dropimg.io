# Moderation

Abuse reports land in D1 (`reports`) via `POST /api/report` and `/abuse`.

## Admin UI

1. Open `/admin/login`
2. Enter the `ADMIN_TOKEN` secret (never put it in the URL)
3. A short-lived **HttpOnly**, **Secure** (staging/production), **SameSite=Strict** cookie is set
4. Review open reports at `/admin/reports`

Actions:

- **View image** — opens the share URL in a new tab (no auto-embed grid)
- **Remove** — deletes R2 object, tombstones the image with `delete_reason = moderation`, resolves related reports
- **Dismiss** — marks the report handled without deleting the image

Sign out clears the admin cookie.

## Removal helper

User delete and moderation remove share [`src/lib/remove-image.ts`](../src/lib/remove-image.ts). Cron expiry uses the same tombstone helper with `delete_reason = expired`.

## Automated scanning

[`src/lib/moderation-hook.ts`](../src/lib/moderation-hook.ts) is a no-op post-strip extension point. Wire a provider later without redesigning upload.

## Secrets

```bash
npx wrangler secret put ADMIN_TOKEN --env production
```
