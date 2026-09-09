# Authentication

Passwordless. No user passwords. No JWT.

Sign-in methods:

- Email magic link (always available)
- Google (when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set)
- GitHub (when `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are set)

Social login is an OAuth *client* of Google/GitHub at `/auth/google` and `/auth/github`. That is separate from DropIMG’s MCP OAuth *provider* at `/oauth/*`.

## Magic link

1. `GET /login` — email form plus Google/GitHub buttons when configured (`noindex`)
2. `POST /login` — stores a hashed one-time token (15 minutes)
3. Email from `signin@dropimg.io`, or in **development only** a visible “Dev sign-in link”
4. `GET /auth/callback?token=` — creates the user on first success, sets `dropimg_session`
5. Invalid and expired links render distinct customer-facing states

## Google / GitHub

1. `GET /auth/google` or `GET /auth/github` — redirects to the provider (signed-in users start a connect)
2. `GET /auth/{provider}/callback` — verifies a signed `state` (URL first, cookie backup), exchanges the code, then creates the same session cookie. Cross-site fetches from Google’s consent UI get `204` and do not consume the code.
3. Signed-in connect/disconnect: `POST /api/account/identities/:provider/connect|disconnect` (CSRF origin check)

Linking:

- Existing `(provider, provider_user_id)` wins
- Else a **verified** email matching `users.email_norm` attaches to that user
- Else a new `users` row
- Soft-deleted emails stay “account gone”
- Two `users.id` rows are never merged (PayPal `custom_id` and MCP tokens hang off the UUID)
- GitHub requires `user:email`; noreply addresses are rejected
- Google requires `email_verified`

`auth_identities` stores the provider user id. One Google and one GitHub per DropIMG user.

6. `GET /api/account/me` — `{ user, entitlements, locale }` for the header
7. `POST /api/auth/logout` / `POST /api/auth/logout-all` — CSRF origin check + revoke

Cookie: HttpOnly, Secure (staging/production), SameSite=Lax, Path=/, about 30 days. Only the SHA-256 hash is stored in D1.

## Rate limits

Wrangler Rate Limiting bindings only support 10s or 60s windows (`wrangler@4.125` schema `simple.period` enum `[10, 60]`).

- Binding `AUTH_LIMIT`: **5 requests / 60 seconds / IP hash** (burst) — magic link and social start
- D1: 60s per-email cooldown; 5 emails / 15 minutes / address; 10 requests / 15 minutes / IP hash

Too many attempts show a human “try again shortly” state, not a developer error.

## Locale

`dropimg_locale` cookie (not HttpOnly) supplements `localStorage`. It is not session/auth state.

## Staging

Magic-link email uses the Worker `EMAIL` binding (`signin@dropimg.io`). Dev echo is **off** on staging. If send fails, `/login` returns an error instead of a fake “check inbox”.
