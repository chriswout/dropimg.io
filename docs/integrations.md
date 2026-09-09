# Integrations

Connect DropIMG to tools you already use with a personal upload token.

Anonymous uploads stay available. An integration token is optional and is not required for Pro.

## Tokens

- ShareX / extension: `dropimg_it_<random>`, scope `upload` (maps to `images:write`)
- API / MCP: `dropimg_api_<random>`, scopes `images:write`, `images:read`, `images:delete` (all three by default)
- Stored as a SHA-256 hash only. The raw token is shown once at creation.
- Tokens are sent as `Authorization: Bearer <token>`.
- Never put a token in a query string, cookie, or analytics event.
- Revoke from Account → Connected integrations. Existing share links stay live.
- REST: [`/developers`](https://dropimg.io/developers) and [`/openapi/v1.yaml`](https://dropimg.io/openapi/v1.yaml)
- MCP: [`/mcp`](https://dropimg.io/mcp)

The browser extension connects with one-click pairing (`POST /api/integrations/browser/start` + `/connect/browser/:id`). That still mints a `dropimg_it_*` token. Browser disconnect removes the local copy only. Account-side Revoke invalidates the token.

## Endpoints

- `GET /api/account/integrations` — session, metadata only
- `POST /api/account/integrations` — session + CSRF, returns raw token once
- `POST /api/account/integrations/:id/revoke` — session + CSRF, idempotent
- `POST /api/integrations/browser/start` — extension, returns pairingId + deviceSecret
- `POST /api/integrations/browser/status` — extension + deviceSecret, returns the token once
- `POST /api/integrations/browser/cancel` — extension + deviceSecret
- `GET /connect/browser/:id` — session page to approve
- `GET /api/integrations/me` — Bearer
- `POST /api/integrations/upload-intent` then `POST /api/integrations/upload/:intent` — Bearer
- `POST /api/integrations/sharex` — anonymous multipart, or Bearer for an owned upload

Free integrations: ownership, My drops, 1h/24h/7d/30d, 10 MB, no passwords.
Pro integrations: those plus 90d and 180d, 50 MB on the intent path, and passwords where the client supports them.

ShareX authenticated uploads stay on a conservative 10 MB multipart cap.

## Lost config

Revoke the old token and create a new one. DropIMG cannot regenerate a previous token or `.sxcu`.
