# Accounts — ownership (V2 Phase B)

Optional passwordless accounts. Anonymous paste-to-link is unchanged.

## Ownership

- Anonymous `POST /api/upload` still creates unowned 24h / 10 MB drops.
- Signed-in homepage uploads use `POST /api/account/upload-intent` then raw `POST /api/account/upload/:intent` so the row gets `user_id`.
- `POST /api/account/claim` attaches local recent items (`slug` + `deleteToken`) to the session user. Wrong tokens and other owners are skipped.

## My drops

`GET /app` (noindex, session required) lists owned, unexpired images. Free shows 10 most recent. Pro paginates with `?cursor=`.

`POST /api/account/images/:slug/delete` (session + CSRF) tombstones an owned image.

## Phase C (Pro)

- Pro uploads go to `o/pro/{date}/{id}`. Anonymous/Free stay on `o/24h/`.
- Staging: `LONG_TTL_ENABLED=true` (7d/30d + extend) and `PRO_50MB_ENABLED=true` after the isolate probe. Production flags stay false.
- Extend copies `o/24h` → `o/pro` before bumping `expires_at`, cap `created_at+30d`.
- JPEG strip is typed-array only. Pro password: `POST /api/account/images/:slug/password` and `POST /api/i/:slug/unlock`.
- Pro can set a password on upload or later via `POST /api/account/images/:slug/password`. Recipients unlock at `POST /api/i/:slug/unlock`. `GET /i/:slug` is 401 without the unlock cookie or owner session.

## Header

`GET /api/account/me` hydrates the header: Sign in, or My drops + `Upgrade to Pro` (Free) + an account menu (Edit account + Sign out). Pro accounts hide the upgrade button and show a Pro badge on the account chip. After sign-in the client claims `dropimg:recent`.

`GET /account` (noindex, session required) is the account page: email, plan, sign out all devices, delete account. `POST /api/account/delete` soft-deletes the user and revokes sessions. Pro billing is not canceled automatically.
