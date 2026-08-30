# Integrations

Connect DropIMG to tools you already use with a personal upload token.

Anonymous uploads stay available. An integration token is optional and is not required for Pro.

## Tokens

- Format: `dropimg_it_<random>`
- Stored as a SHA-256 hash only. The raw token is shown once at creation.
- Scope is `upload`. Tokens are sent as `Authorization: Bearer <token>`.
- Never put a token in a query string, cookie, or analytics event.
- Revoke from Account → Connected integrations. Existing share links stay live.

Browser disconnect (extension) removes the local copy only. Account-side Revoke invalidates the token.

## Endpoints

- `GET /api/account/integrations` — session, metadata only
- `POST /api/account/integrations` — session + CSRF, returns raw token once
- `POST /api/account/integrations/:id/revoke` — session + CSRF, idempotent
- `GET /api/integrations/me` — Bearer
- `POST /api/integrations/upload-intent` then `POST /api/integrations/upload/:intent` — Bearer
- `POST /api/integrations/sharex` — anonymous multipart, or Bearer for an owned upload

Free integrations: ownership, My drops, 1h/24h/7d, 10 MB, no passwords.  
Pro integrations: those plus 30d and 90d, 50 MB on the intent path, and passwords where the client supports them.

ShareX authenticated uploads stay on a conservative 10 MB multipart cap.

## Lost config

Revoke the old token and create a new one. DropIMG cannot regenerate a previous token or `.sxcu`.
