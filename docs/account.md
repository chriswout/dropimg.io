# Accounts

Optional passwordless accounts. Anonymous paste-to-link is unchanged.

## Ownership

- Anonymous `POST /api/upload` still creates unowned 24h / 10 MB drops.
- Signed-in homepage uploads use `POST /api/account/upload-intent` then raw `POST /api/account/upload/:intent` so the row gets `user_id`.
- `POST /api/account/claim` attaches local recent items (`slug` + `deleteToken`) to the session user. Wrong tokens and other owners are skipped.

## My drops

`GET /app` (noindex, session required) lists owned, unexpired images. Free shows the last 10 active uploads. Pro paginates with `?cursor=`.

Rows show the share host path, type/size/dimensions, time left, and lock state. The dashboard does **not** load original images as thumbnails.

`POST /api/account/images/:slug/delete` (session + CSRF) tombstones an owned image.

## Pro extras (when flags are on)

- Uploads go to `o/pro/{date}/{id}`. Anonymous/Free stay on `o/24h/`.
- Staging: `LONG_TTL_ENABLED=true` (7d/30d + extend) and `PRO_50MB_ENABLED=true`. Production flags stay false.
- Extend copies `o/24h` → `o/pro` before bumping `expires_at`, cap `created_at+30d`.
- Pro can set a password on upload or later via `POST /api/account/images/:slug/password`. Recipients unlock at `POST /api/i/:slug/unlock`. `GET /i/:slug` is 401 without the unlock cookie or owner session.

## Header

`GET /api/account/me` hydrates the header:

- Anonymous: **Pro · $1.99** + Sign in
- Free: My drops + **Upgrade** + account menu
- Pro: My drops + **PRO** badge (no upgrade CTA)

After sign-in the client claims `dropimg:recent`.

`GET /account` (noindex, session required) is organized as Account, Plan, Integrations, Security, and Danger zone. Customer-facing billing copy uses “Renews …” / “Ends …” — not provider IDs.

`POST /api/account/delete` cancels live Pro billing first, then removes images, revokes integration tokens and sessions, and soft-deletes the user. If Paddle cancel fails, the account is **not** deleted.

## Integrations

Session-only token management:

- `GET /api/account/integrations` — metadata only (never the raw token)
- `POST /api/account/integrations` — create; raw token returned once
- `POST /api/account/integrations/:id/revoke` — idempotent; rows keep `revoked_at`

See [integrations.md](integrations.md). Anonymous ShareX and anonymous extension upload stay available.
