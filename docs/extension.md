# Browser extension

Manifest V3 extension for Chrome and Edge. Source: [`extension/`](../extension/).

## Capabilities (V1.7)

- **Visible** tab capture
- **Region** capture (draw a rectangle)
- **Full page** capture (scroll-and-stitch)
- Silent shortcut **Alt+Shift+D** (visible → upload → clipboard + toast)
- Recent drops (local, max 10) with copy / open / delete
- One-click DropIMG account pairing (final credential is still `dropimg_it_*`)
- Locales: English, Spanish, Portuguese (Brazil), German

Anonymous capture is unchanged and remains the default.

## Account connection

1. Open the popup → DropIMG account → Connect account
2. The extension starts `POST /api/integrations/browser/start` and opens
   `/connect/browser/:pairingId`
3. Sign in if needed (`?next=` is allowlisted for that path), then approve
4. The extension polls `POST /api/integrations/browser/status` with the device
   secret (never in the URL) and stores the one-time `dropimg_it_*` token.
   Pending pairings last 120 seconds. After approve, the credential can be
   retrieved for 60 seconds; an unused approved pairing then expires, the
   secret is wiped, and the minted extension token is revoked.

The token is stored in `chrome.storage.local` only (never `sync`, never analytics, never console). Disconnect removes the local token; it does **not** revoke it. Revoke from the account page to invalidate uploads immediately.

Connected captures use `POST /api/integrations/upload-intent` then `POST /api/integrations/upload/:intent`. Free can pick 1h / 24h / 7d / 30d at 10 MB; Pro adds 90d and 180d. Anonymous captures send no expiry and take the server's 7-day default. Last expiry is remembered locally, and the server re-checks it against the account's entitlements on every intent.

If the token is revoked or invalid, the extension shows a connection error and does **not** fall back to an anonymous upload.

Upload size comes from the account's `maxUploadBytes` rather than a constant, so
Pro's larger cap applies as soon as a token is connected, and the "too large"
message names the caller's own limit. The size is checked client-side only to
avoid spending an upload to be told a number we already had; the server still
enforces it.

Image passwords are not in the extension popup for this release.

Full-page capture stitches `captureVisibleTab` tiles at the current viewport
width (not horizontal `scrollWidth`). After the first tile it hides `position:
fixed` overlays. Sticky elements are hidden only after they were visible in an
earlier tile, so section headings still appear once. Tiles are painted at the
browser's actual `scrollY`. Scroll position and styles are restored in
`finally`. Oversized pages fail with `full_page_too_large` instead of a partial
shot.

## Build

```bash
npm run ext:build   # → extension/dist
npm run ext:pack    # → extension/dropimg-extension.zip
```

Load unpacked from `extension/dist` for local testing. Point uploads at production `https://dropimg.io` (or change origin in shared config for staging).

## Permissions

See `/browser-extension` and Privacy Policy §2.7. Host access is limited to dropimg.io for uploads and pairing.

## Attribution

Uploads send `X-Dropimg-Client: chrome-extension` or `edge-extension` (UA detect).

## Store listing

Listing copy, single-purpose statement, permission justifications and the data-use
declarations live in [`extension/store/LISTING.md`](../extension/store/LISTING.md).
Screenshots are generated — see that file.

Chrome Web Store (public):
`https://chromewebstore.google.com/detail/dropimgio-screenshot-to-link/lhgmnekggpifejiphipjebjlcphabhib`

That URL is the homepage / Integrations / `/browser-extension` install CTA.
Uploads already send `X-Dropimg-Client: chrome-extension` or `edge-extension`.
