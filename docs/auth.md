# Authentication

Passwordless email magic links. No user passwords. No social login. No JWT.

## Flow

1. `GET /login` — email form (`noindex`, `X-Robots-Tag: noindex`)
2. `POST /login` — stores a hashed one-time token (15 minutes)
3. Email from `signin@dropimg.io`, or in **development only** a visible “Dev sign-in link”
4. `GET /auth/callback?token=` — creates the user on first success, sets `dropimg_session`
5. Invalid and expired links render distinct customer-facing states
6. `GET /api/account/me` — `{ user, entitlements, locale }` for the header
7. `POST /api/auth/logout` / `POST /api/auth/logout-all` — CSRF origin check + revoke

Cookie: HttpOnly, Secure (staging/production), SameSite=Lax, Path=/, about 30 days. Only the SHA-256 hash is stored in D1.

## Rate limits

Wrangler Rate Limiting bindings only support 10s or 60s windows (`wrangler@4.125` schema `simple.period` enum `[10, 60]`).

- Binding `AUTH_LIMIT`: **5 requests / 60 seconds / IP hash** (burst)
- D1: 60s per-email cooldown; 5 emails / 15 minutes / address; 10 requests / 15 minutes / IP hash

Too many attempts show a human “try again shortly” state, not a developer error.

## Locale

`dropimg_locale` cookie (not HttpOnly) supplements `localStorage`. It is not session/auth state.

## Staging

Magic-link email uses the Worker `EMAIL` binding (`signin@dropimg.io`). Dev echo is **off** on staging. If send fails, `/login` returns an error instead of a fake “check inbox”.
