# dropimg.io browser extension (Chrome / Edge) — v1.6.0

Screenshot → temporary share link on [dropimg.io](https://dropimg.io). Manifest V3.
Locales: English, Spanish, Portuguese (Brazil), German.

## Features

- **Visible** tab capture
- **Region** crop (draw on the page)
- **Alt+Shift+D** silent visible capture → clipboard + page toast (~7s)
- Recent drops (last 10, on-device — copy / open / delete)
- Optional DropIMG account connection, which adds a link-lifetime picker
- Light / dark UI matching the site

## Behavior

| Action | Result |
|--------|--------|
| Toolbar click | Opens popup — choose Visible or Region, then **Capture**. Popup stays open with the link. |
| Alt+Shift+D | Silent visible capture → toast + clipboard |
| Region | Popup closes to draw → toast + clipboard; may reopen popup |

Anonymous capture is the default and needs no account.

## Account connection

1. Popup → **DropIMG account** → Connect
2. Open [dropimg.io/app/integrations](https://dropimg.io/app/integrations) and create a
   Browser Extension token
3. Paste it. The extension checks it against `GET /api/integrations/me` before saving.

The token lives in `chrome.storage.local` only — never `sync`, never logged, never
sent anywhere but dropimg.io. Disconnect removes it locally; it does **not** revoke
it. Revoke from the account page to stop uploads immediately.

Connected captures go through `POST /api/integrations/upload-intent` then
`POST /api/integrations/upload/:intent`. Free picks 1h / 24h / 7d; Pro adds 30d and
90d. Anonymous captures send no lifetime and take the server's default. The chosen
lifetime is remembered on-device, and the server re-checks it against the account's
entitlements on every intent, so a lapsed subscription falls back instead of failing.

Upload size is read from the account rather than assumed, so Pro's larger limit
applies as soon as it is connected. If a token is revoked or invalid the extension
reports a connection error and does **not** silently fall back to an anonymous
upload.

Image passwords are not in the popup for this release. Full-page stitching was
dropped, not deferred — Chrome's capture rate limit and sticky headers made it
unreliable enough that it was not worth shipping.

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
| `scripting` | Inject the region selector and the result toast |
| `storage` | Recent drops, capture mode, connected account token |
| `offscreen` | Clipboard write for silent and region captures |
| `notifications` | Fallback when the page toast cannot be injected |
| `https://dropimg.io/*` | The upload API — the only host contacted |

No `tabs` permission, no broad host access, no analytics, no remote code.

## Store submission

See [`store/LISTING.md`](store/LISTING.md) for listing copy, the single-purpose
statement, per-permission justifications and the data-use declarations, and
[`../docs/extension.md`](../docs/extension.md) for how the pieces fit together.
