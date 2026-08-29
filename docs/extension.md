# Browser extension

Manifest V3 extension for Chrome and Edge. Source: [`extension/`](../extension/).

## Capabilities (V1.5)

- **Visible** tab capture
- **Region** capture (draw a rectangle)
- Silent shortcut **Alt+Shift+D** (visible → upload → clipboard + toast)
- Recent drops (local, max 10) with copy / open / delete
- Locales: English, Spanish, Portuguese (Brazil), German

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
