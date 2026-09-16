---
name: dropimg-web-assets
description: >-
  Routes visual files through DropIMG: temporary Drops vs permanent Media Web
  Assets. Use when uploading screenshots, logos, favicons, heroes, illustrations,
  or web fonts; when writing /m/... URLs into app code; or when replacing a site
  asset. MCP endpoint is https://dropimg.io/mcp (one server).
---

# DropIMG Web Assets

Two products. One MCP: `https://dropimg.io/mcp`. Never invent a `/m/...` URL.

## Decide in one step

| User intent | Product |
|---|---|
| Screenshot for a bug report | **Drop** |
| Screenshot for GitHub issue | **Drop** |
| Image pasted into chat / Slack | **Drop** |
| Debugging / disposable visual | **Drop** |
| Logo used by the website | **Media** |
| Homepage hero | **Media** |
| Product photo in the app | **Media** |
| favicon.ico | **Media** |
| logo.svg | **Media** |
| Inter.woff2 (or other WOFF/WOFF2) | **Media** |
| PDF brochure | **unsupported** |
| ZIP / archive | **unsupported** |
| Video, audio, HTML, JS, CSS, EXE | **unsupported** |

If the file will be **referenced by application or site code**, it is Media.
If it is a **temporary share for humans** (issue, PR, Slack, debug), it is a Drop.

"Create another logo URL because I changed the logo" → **replace** the existing Media asset. Do not mint a new path.

## Formats

**Media (Web Assets):** JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2.

**Drops:** PNG, JPEG, WebP, GIF only. No SVG.

**Unsupported everywhere:** PDF, video, audio, ZIP/TAR, HTML/JS/CSS/PHP, source, generic blobs, TTF/OTF/EOT.

On unsupported: explain once. Do not retry other MIME types or invent hosting.

## Tools

### Drops (temporary)

`upload_image` · `get_image` · `list_images` · `delete_image`

`upload_image` takes workspace bytes as base64 / data URL. That flow is Drop-only.

### Media (permanent)

`list_media_projects` · `create_media_project` · `list_media_assets` · `get_media_asset` · `upload_media_asset` · `replace_media_asset`

No `upload_svg` / `upload_font` / `upload_avif`. HTTP ingest detects the type.

## Media write path (mandatory)

Never put Media binaries or base64 in MCP JSON-RPC.

```text
upload_media_asset { project_id, path }
  → POST file bytes to upload_url (intent Authorization header)
  → read asset.url from the HTTP JSON
  → put that URL in code
```

Replace:

```text
list_media_assets / get_media_asset
  → replace_media_asset { project_id, asset_id, confirm: true }
  → POST new bytes to the new upload_url
  → leave application code unchanged
```

Without `confirm: true`, replacement is refused. Retry with confirm only when the user asked to replace.

Intents are one-use, 10 minutes. Expired/replayed intent → mint a new one. Do not reuse.

## Stable URL rule

Aliases look like `/m/{org}/{project}/{path}` (example: `/m/acme/site/homepage/hero`).

- Do not construct this path yourself.
- Do not guess org/project/path from filenames.
- Use the `url` returned after HTTP ingest or from `get_media_asset`.

Replacement keeps that URL. Versions change; the alias does not.

## Project scope

Always pass `project_id`. There is no implicit current project.

- Unknown project → `list_media_projects`. If still ambiguous, ask.
- New project → `create_media_project` only with account/OAuth/`dropimg_api_*`. A `dropimg_pk_*` key cannot create projects.
- `dropimg_pk_*` is one project. Cross-project calls return not found. Do not probe other projects.
- Revoked/expired key → stop. Ask for a fresh credential. Do not work around auth.

## Path names (new Media assets)

Semantic role, no extension required:

Good: `branding/logo` · `branding/logo-dark` · `branding/favicon` · `homepage/hero` · `homepage/feature-grid` · `products/widget/front` · `fonts/inter/regular`

Bad: `file123` · `img1` · `new-logo-final-v7` · `abc827362`

## Replace vs create

If code already points at a DropIMG Media URL, **replace** that asset.

Do not:

- upload a duplicate under a new path
- rewrite the `<img>` / `@font-face` / favicon href
- invent a second logo URL

Cross-MIME replace is allowed (`branding/logo` SVG → PNG). Trust returned `mime` / `asset_type`, not the filename.

## Format notes

**SVG:** server sanitizes. Active script, `on*`, `foreignObject`, external resources, `javascript:` / unsafe `data:` URLs are rejected. Stored bytes may differ from upload. The alias still works. Do not depend on SVG scripting or remote loads.

**Fonts:** WOFF/WOFF2 only. After upload, reference `asset.url` with `@font-face`. No TTF/OTF/EOT.

**Public aliases** are not secret. Anyone with the URL can fetch the file.

## Errors

| Situation | Agent action |
|---|---|
| Unsupported type | Explain scope. Stop. |
| Revoked/expired key | Ask for a new `dropimg_pk_*` or OAuth. |
| Project not found | List projects. Do not brute-force IDs. |
| Replace missing `confirm: true` | Retry with confirm if the user wanted replace. |
| Intent expired / already used | New `upload_media_asset` / `replace_media_asset`. |
| SVG unsafe | Tell the user it was rejected; do not strip client-side and silently rehost as PNG unless they ask. |

## Connect

```json
{
  "mcpServers": {
    "dropimg": {
      "url": "https://dropimg.io/mcp",
      "headers": { "Authorization": "Bearer dropimg_pk_YOUR_KEY" }
    }
  }
}
```

Production Media may be flagged off; staging/local needs `MEDIA_ENABLED=true`. API details: `docs/media-mcp.md`. Do not copy this skill into a second MCP server.
