# ShareX

Upload screenshots from [ShareX](https://getsharex.com/) to dropimg.io.

## Anonymous setup

1. Download [`integrations/sharex/dropimg.sxcu`](../integrations/sharex/dropimg.sxcu)
2. Open the file (or Import in ShareX → Destinations → Custom uploader)
3. Set dropimg.io as the image uploader destination

Anonymous uploads stay at 10 MB, are not attached to an account, and default to 7 days. A `expiry=1h|24h|7d` form field is honoured; anything else is rejected.

## Account setup

1. Sign in at [dropimg.io/account](https://dropimg.io/account)
2. Integrations → Create ShareX config
3. Download `dropimg-sharex.sxcu` immediately — DropIMG will not show the token again
4. Import that file in ShareX

The personal config includes `Authorization: Bearer dropimg_it_…`. Keep it private. If you lose it, revoke the old token and create a new config.

Authenticated ShareX uploads are owned (My drops) and use current account entitlements. Expiry can be set with a form field: `expiry=1h`, `24h`, or `7d` on Free, plus `30d` and `90d` on Pro with long TTL enabled. Omitting it uses the account's default (7 days). Multipart size stays conservative (10 MB). No image password in the ShareX config.

## Endpoint

`POST /api/integrations/sharex`

- No `Authorization`: anonymous adapter → `/api/upload`
- `Authorization: Bearer …`: owned upload

JSON matches `/api/upload` (`url`, `imageUrl`, `deleteUrl`, `deleteToken`, `expiresAt`, …). ShareX uses `{json:url}` as the share link.
