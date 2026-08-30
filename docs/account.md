# Accounts

Optional passwordless accounts. Anonymous paste-to-link is unchanged.

## Ownership

- Anonymous `POST /api/upload` still creates unowned 10 MB drops. The lifetime comes from the `X-Dropimg-Expiry` header (1h/24h/7d) and defaults to 7 days.
- Signed-in homepage uploads use `POST /api/account/upload-intent` then raw `POST /api/account/upload/:intent` so the row gets `user_id`.
- `POST /api/account/claim` attaches local recent items (`slug` + `deleteToken`) to the session user. Wrong tokens and other owners are skipped.

## My drops

`GET /app` (noindex, session required) lists owned, unexpired images. Free shows the last 10 active uploads. Pro paginates with `?cursor=`.

Rows show the share host path, type/size/dimensions, time left, and lock state. The dashboard does **not** load original images as thumbnails.

`POST /api/account/images/:slug/delete` (session + CSRF) tombstones an owned image.

## Pro extras (when flags are on)

- Uploads go to `o/pro/{date}/{id}` whatever lifetime is chosen. Anonymous/Free split between `o/24h/` (1h, 24h) and `o/7d/` (7d).
- Staging: `LONG_TTL_ENABLED=true` (Free 1h/24h/7d, Pro adds 30d/90d, plus extend) and `PRO_50MB_ENABLED=true`. Production flags stay false.
- Extend copies `o/24h` or `o/7d` → `o/pro` before bumping `expires_at`, cap `created_at+90d`.
- Pro can set a password on upload or later via `POST /api/account/images/:slug/password`. Recipients unlock at `POST /api/i/:slug/unlock`. `GET /i/:slug` is 401 without the unlock cookie or owner session.

## Header

`GET /api/account/me` hydrates the header:

- Anonymous: **Pro · €2.99** + Sign in
- Free: My drops + **Upgrade** + account menu
- Pro: My drops + **PRO** badge (no upgrade CTA)

After sign-in the client claims `dropimg:recent`.

`GET /account` (noindex, session required) is organized as Account, Plan, Integrations, Security, and Danger zone. Customer-facing billing copy uses “Renews …” / “Ends …” — not provider IDs.

`POST /api/account/delete` cancels live Pro billing first, then removes images, revokes integration tokens and sessions, and soft-deletes the user. If the Stripe cancel fails, the account is **not** deleted.

## Integrations

Session-only token management:

- `GET /api/account/integrations` — metadata only (never the raw token)
- `POST /api/account/integrations` — create; raw token returned once
- `POST /api/account/integrations/:id/revoke` — idempotent; rows keep `revoked_at`

See [integrations.md](integrations.md). Anonymous ShareX and anonymous extension upload stay available.
