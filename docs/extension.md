# Browser extension

Manifest V3 extension for Chrome and Edge. Source: [`extension/`](../extension/).

## Capabilities (V1.6)

- **Visible** tab capture
- **Region** capture (draw a rectangle)
- Silent shortcut **Alt+Shift+D** (visible → upload → clipboard + toast)
- Recent drops (local, max 10) with copy / open / delete
- Optional DropIMG account connection (personal integration token)
- Locales: English, Spanish, Portuguese (Brazil), German

Anonymous capture is unchanged and remains the default.

## Account connection

1. Open the popup → DropIMG account → Connect
2. Open [dropimg.io/account](https://dropimg.io/account) and create a Browser Extension token
3. Paste the token. The extension validates it with `GET /api/integrations/me` before saving.

The token is stored in `chrome.storage.local` only (never `sync`, never analytics, never console). Disconnect removes the local token; it does **not** revoke it. Revoke from the account page to invalidate uploads immediately.

Connected captures use `POST /api/integrations/upload-intent` then `POST /api/integrations/upload/:intent`. Free stays 24h / 10 MB. Pro can pick 24h / 7d / 30d when those expiries are enabled. Last expiry is remembered locally and re-checked on the server.

If the token is revoked or invalid, the extension shows a connection error and does **not** fall back to an anonymous upload.

Image passwords are not in the extension popup for this release.

Full-page capture is **deferred** (Chrome capture-rate + sticky-header fragility).

## Build

```bash
npm run ext:build   # → extension/dist
npm run ext:pack    # → extension/dropimg-extension.zip
```

Load unpacked from `extension/dist` for local testing. Point uploads at production `https://dropimg.io` (or change origin in shared config for staging).

## Permissions

See `/browser-extension` and Privacy Policy §2.7. Host access is limited to dropimg.io for uploads.

## Attribution

Uploads send `X-Dropimg-Client: chrome-extension` or `edge-extension` (UA detect).

## Store listing

When the Chrome Web Store / Edge Add-ons URLs are live, update:

- [`marketing/extension.ts`](../marketing/extension.ts) install copy
- Homepage extension promo link (already points at `/browser-extension`)
