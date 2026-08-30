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

## Next safety phase (required before paid traffic or share-page ads)

Today's model is reactive: everything is publicly viewable the moment it is stored, and content only leaves after a human report. That is workable for organic traffic and it is **not** sufficient once we buy traffic or monetise share pages, because both put us in front of content nobody has looked at yet.

The next phase replaces the implicit "live" state with an explicit one on `images`:

| State | Share page | Ads | How it is reached |
| --- | --- | --- | --- |
| `pending` | served | never | default at upload, until the scanner returns |
| `approved` | served | allowed | scanner clears it, or an admin approves |
| `review_required` | served | never | scanner is unsure, queued for a human |
| `restricted` | interstitial | never | legal-but-sensitive, admin decision |
| `rejected` | 410 | never | scanner is confident it violates the Terms |
| `removed` | 410 | never | admin removal or an upheld report |

Rules that fall out of the table, and that the implementation has to enforce rather than document:

- **Ads only ever render on `approved`.** The gate belongs in `renderAdSlot`, keyed off the row, not off the page template — so a new surface cannot accidentally opt in.
- **`pending` is not a queue for the uploader.** The link works immediately; the state only governs ads and how fast we can pull it. Making people wait would destroy the product.
- **Automated quarantine, then a human.** `moderation-hook.ts` becomes the scanner call site, writing `pending → approved | review_required | rejected` and leaving an audit row.
- **Reports keep working unchanged** and move a row to `review_required` rather than resolving straight to `removed`.

Scope for that phase: the state column and migration, the scanner integration behind a flag, the ad gate, an admin queue for `review_required`, and retention of moderation decisions after the image itself expires. It is deliberately **not** part of the Phase G design work.

Until it ships: `UGC_SHARE_ADS_ENABLED=false` everywhere, and no paid acquisition.

## Secrets

```bash
npx wrangler secret put ADMIN_TOKEN --env production
```
