# dropimg.io browser extension (Chrome / Edge) — v1.7.0

Screenshot → temporary share link on [dropimg.io](https://dropimg.io). Manifest V3.
Locales: English, Spanish, Portuguese (Brazil), German.

## Features

- **Visible** tab capture
- **Region** crop (draw on the page)
- **Full page** capture (scroll and stitch the entire webpage)
- **Alt+Shift+D** silent visible capture → clipboard + page toast (~7s)
- Recent drops (last 10, on-device — copy / open / delete)
- One-click DropIMG account connection (no token copy/paste)
- Light / dark UI matching the site

## Behavior

| Action | Result |
|--------|--------|
| Toolbar click | Opens popup — choose Visible, Region, or Full page, then **Capture**. |
| Alt+Shift+D | Silent visible capture → toast + clipboard |
| Region | Popup closes to draw → toast + clipboard; may reopen popup |
| Full page | Scrolls the page, stitches tiles, then uploads |

Anonymous capture is the default and needs no account.

## Account connection

1. Popup → **DropIMG account** → Connect account
2. A DropIMG tab opens. Sign in if needed, then click **Connect**
3. The popup becomes connected automatically

The credential is a normal `dropimg_it_*` integration token, stored in
`chrome.storage.local` only — never `sync`, never shown, never logged. Disconnect
removes it locally; it does **not** revoke it. Revoke from Manage account
(`/app/integrations`) to stop uploads immediately.

Power users can still paste a token via **Use a token instead**.

Connected captures go through `POST /api/integrations/upload-intent` then
`POST /api/integrations/upload/:intent`. Free picks 1h / 24h / 7d / 30d; Pro adds
90d and 180d. Anonymous captures send no lifetime and take the server's default. The chosen
lifetime is remembered on-device, and the server re-checks it against the account's
entitlements on every intent, so a lapsed subscription falls back instead of failing.

Upload size is read from the account rather than assumed, so Pro's larger limit
applies as soon as it is connected. If a token is revoked or invalid the extension
reports a connection error and does **not** silently fall back to an anonymous
upload.

Image passwords are not in the popup for this release.

Full-page capture scrolls the document, captures viewport tiles at Chrome's
`captureVisibleTab` rate (650ms gap), hides fixed/sticky overlays after the first
tile so they are not repeated, then restores scroll position and styles. Pages
that would exceed a 16384px canvas edge, 20 000 CSS pixels of height, or 24 tiles
return `full_page_too_large` instead of a partial image.

## Build

```bash
npm run ext:build   # → extension/dist
npm run ext:pack    # → extension/dropimg-extension.zip
```

Load unpacked from `extension/dist` for local testing. Uploads point at production
`https://dropimg.io`; change `API_ORIGIN` in `src/shared.ts` for staging.

`_locales` catalogs are generated at build time from `src/messages.ts`, which is the
single source of truth — do not hand-edit anything under `dist/`.

## Permissions

| Permission | Why |
|------------|-----|
| `activeTab` | Capture the tab you invoke the extension on |
| `scripting` | Region overlay, full-page scroll/restore, result toast |
| `storage` | Recent drops, capture mode, pairing session, connected account |
| `offscreen` | Clipboard write for silent and region captures |
| `notifications` | Fallback when the page toast cannot be injected |
| `https://dropimg.io/*` | The only host the extension contacts |

No `tabs` permission, no broad host access, no analytics, no remote code.

## Store submission

See [`store/LISTING.md`](store/LISTING.md) for listing copy, the single-purpose
statement, per-permission justifications and the data-use declarations, and
[`../docs/extension.md`](../docs/extension.md) for how the pieces fit together.
