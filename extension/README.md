# dropimg.io browser extension (Chrome / Edge) — v1.5.0

Screenshot → temporary share link on [dropimg.io](https://dropimg.io). Locales: English, Spanish, Portuguese (Brazil), German.

## Features (shipped)

- **Visible** tab capture
- **Region** crop (draw on the page)
- Recent drops (last 10, local — copy / open / delete)
- **Alt+Shift+D** silent visible capture → clipboard + page toast (~7s)
- Light / dark UI matching the site

Full-page stitch is deferred (planned 1.5.1).

## Behavior

| Action | Result |
|--------|--------|
| Toolbar click | Opens popup — choose Visible or Region, then **Capture**. Popup stays open with the link. |
| Alt+Shift+D | Silent visible capture → toast + clipboard |
| Region | Popup closes to draw → toast + clipboard; may reopen popup |

## Load unpacked

```bash
npm run ext:build
```

Chrome / Edge → Developer mode → **Load unpacked** → `extension/dist/`

## Package

```bash
npm run ext:pack
```

## Permissions

- `activeTab` — capture the tab you invoke on
- `scripting` — region overlay (+ page toast)
- `storage` — recent drops + last mode
- `offscreen` — clipboard for silent / region
- `notifications` — fallback if toast can’t inject
- Host `https://dropimg.io/*` — upload API
