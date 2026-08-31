# Chrome Web Store submission

Everything the dashboard asks for, in the order it asks. Edge Add-ons reuses the
same package and copy.

Package: `npm run ext:pack` → `extension/dropimg-extension.zip` (v1.6.0).

---

## Store listing

**Item name**

```
dropimg.io — Screenshot to link
```

**Summary** (132 char limit; this is 108)

```
Capture the visible tab or a region, get a temporary share link on your clipboard. No account needed.
```

**Category:** Productivity
**Language:** English (listing), with the extension itself localized to English,
Spanish, Portuguese (Brazil) and German.

**Detailed description**

```
Take a screenshot, get a link. That's the whole thing.

Click the toolbar icon or press Alt+Shift+D and dropimg.io captures your
current tab, uploads it, and puts a short share link on your clipboard. No
account, no sign-up, no waiting on a dialog.

CAPTURE
• Visible tab — everything you can see, one click
• Region — draw a rectangle over the part you actually mean
• Alt+Shift+D — silent capture with no popup at all, link copied and a small
  toast on the page to confirm

LINKS THAT EXPIRE
Every link has a lifetime and then it's gone. Nothing you share sticks around
forever by accident, and nothing you upload is ever public, listed, indexed or
searchable — a link only works for someone you gave it to.

Without an account your captures use the site's default lifetime. Connect a
free DropIMG account and you can choose 1 hour, 24 hours or 7 days per capture.
DropIMG Pro adds 30 and 90 days, larger uploads, and full upload history at
dropimg.io.

RECENT DROPS
Your last 10 links stay in the popup so you can re-copy, open or delete one
without leaving the page you're on. They live on your device, not on a server.

PRIVACY
• Only reaches dropimg.io — no other site, ever
• No analytics, no tracking, no ads, no remote code
• Camera and location metadata is stripped from every upload before it is stored
• Captures happen only when you ask: a click or the keyboard shortcut
• If you connect an account, the token stays on that device and is never synced

Works in Chrome and Edge. Free and open about what it does.

Privacy policy: https://dropimg.io/privacy
Questions: https://dropimg.io/contact
```

**Homepage URL:** `https://dropimg.io/browser-extension`
**Support URL:** `https://dropimg.io/contact`
**Privacy policy URL:** `https://dropimg.io/privacy`

---

## Privacy practices

**Single purpose**

```
DropIMG captures a screenshot of the tab the user is currently on — either the
whole visible area or a region they draw — uploads it to dropimg.io, and returns
a temporary share link to their clipboard. Every feature in the extension exists
to serve that one flow: the capture modes produce the image, the recent list
re-copies links already created, and the optional account connection lets the
user choose how long a link lives before it expires.
```

**Permission justifications** — one per permission, as the dashboard requires.

`activeTab`

```
Used to capture the tab the user invokes the extension on. The extension reads
the tab only in response to a deliberate action — clicking the toolbar icon and
pressing Capture, or pressing the Alt+Shift+D shortcut — and uses it solely to
produce the screenshot the user asked for. activeTab is used specifically to
avoid requesting standing access to any site.
```

`scripting`

```
Two uses, both on the tab the user just captured. First, region capture injects
a one-time overlay so the user can drag a rectangle to select part of the page;
it is removed as soon as they select or press Esc. Second, after a silent or
region capture the extension injects a small toast showing the resulting link
with copy and open buttons, because the popup is closed in those flows and there
would otherwise be no way to surface the result. No script is injected until the
user triggers a capture.
```

`storage`

```
Stores, on the user's own device: the last 10 share links so they can be
re-copied from the popup, the last capture mode used, and — only if the user
chooses to connect a DropIMG account — their personal integration token and the
link lifetime they picked. The token is kept in local storage specifically so it
is never synced off the device. Nothing in storage is transmitted anywhere
except the token, which authenticates the user's own uploads to dropimg.io.
```

`offscreen`

```
Writes the resulting share link to the clipboard after a silent (Alt+Shift+D) or
region capture. Those flows have no open popup, and a Manifest V3 service worker
has no DOM and therefore no clipboard access, so an offscreen document is the
only supported way to complete the copy the user is expecting.
```

`notifications`

```
A fallback for showing the result of a silent or region capture. The extension
first tries to display an in-page toast, but that is impossible on pages where
scripts cannot be injected, such as the Chrome Web Store or a PDF viewer. A
notification is shown only in that case, only after a capture the user started,
and only to report success with the link or an error.
```

Host permission `https://dropimg.io/*`

```
The upload API. Screenshots are POSTed to dropimg.io, and the extension calls
the same origin to validate a connected account token and to delete an image the
user removes from the recent list. This is the only host the extension contacts;
there is no analytics endpoint and no third-party service of any kind.
```

**Data use declarations**

| Category | Collected | Why |
|---|---|---|
| Personally identifiable information | **No** | If an account is connected the server returns a masked email (`c***@example.com`) for display only. Nothing identifying is read from the browser or the pages visited. |
| Health information | No | — |
| Financial and payment information | No | Subscriptions are bought on the website, never in the extension. |
| Authentication information | **Yes** | The optional integration token. Supplied by the user, stored on-device, sent only to dropimg.io to authenticate their own uploads. |
| Personal communications | No | — |
| Location | No | Location metadata is actively stripped from uploads. |
| Web history | No | No browsing history is read, stored or transmitted. |
| User activity | No | No click, scroll, keystroke or mouse tracking. The drag used to pick a region never leaves the page. |
| Website content | **Yes** | The screenshot itself. Captured only on an explicit user action and uploaded only to dropimg.io. |

All three certifications apply and can be checked:

- Data is not sold or transferred to third parties outside the approved use cases.
- Data is not used or transferred for anything unrelated to the single purpose above.
- Data is not used or transferred to determine creditworthiness or for lending.

**Remote code:** none. Everything executed is bundled into the package by esbuild.
No `eval`, no remotely hosted scripts, no external stylesheets, no CDN.

---

## Assets

| Asset | Size | File |
|---|---|---|
| Store icon | 128×128 | `store-icon-128.png` |
| Screenshot 1 | 1280×800 | `screenshots/01-popup-idle.png` |
| Screenshot 2 | 1280×800 | `screenshots/02-popup-success.png` |
| Screenshot 3 | 1280×800 | `screenshots/03-recent-drops.png` |
| Screenshot 4 | 1280×800 | `screenshots/04-account.png` |

Regenerate the screenshots with:

```bash
npm run ext:screens
```

They are rendered from the real popup markup and CSS, so they cannot drift from
what ships. Chrome requires at least one 1280×800 or 640×400 shot; up to five are
allowed. Promo tiles (440×280 small, 1400×560 marquee) are optional and not
supplied.

---

## Before submitting

- [ ] `npm run ext:build && npm run ext:pack`
- [ ] Load `extension/dist` unpacked and run through: visible capture, region
      capture, Alt+Shift+D, connect an account, change lifetime, delete a recent
- [ ] Confirm `/privacy` and `/contact` return 200 — Chrome fetches both, and a
      404 on either fails review
- [ ] Check the version in `manifest.json` is higher than the published one
- [ ] Submit the same zip to Edge Add-ons

After the listing is live, update `marketing/extension.ts`, which currently reads
"Store links: coming soon".
