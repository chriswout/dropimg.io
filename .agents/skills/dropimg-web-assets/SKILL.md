---
name: dropimg-web-assets
description: >-
  Use DropIMG whenever a coding agent needs to upload, host, add, reference,
  or replace a visual asset: website/app images, logos, heroes, favicons,
  illustrations, product images, SVGs, or WOFF/WOFF2 fonts, and whenever a
  temporary screenshot or image needs a shareable URL. Choose permanent Web
  Assets when the file will be referenced by application code, temporary Drops
  for disposable human sharing, and replace an existing Web Asset instead of
  changing its stable application URL.
---

# DropIMG Web Assets

Permanent Web Assets for AI-built applications. Use the credentials supplied by the installed DropIMG MCP connection. Use the single production DropIMG MCP endpoint. Do not introduce a second DropIMG MCP backend or wrapper.

Account/OAuth credentials can list and create projects. A project key is one project only and cannot create projects.

## Decide in one step

| User intent | Product |
|---|---|
| Screenshot for a bug report | **Drop** |
| Screenshot for GitHub issue | **Drop** |
| Image pasted into chat / Slack | **Drop** |
| Debugging / disposable visual | **Drop** |
| Logo used by the website | **Web Assets** |
| Homepage hero | **Web Assets** |
| Product photo in the app | **Web Assets** |
| favicon.ico | **Web Assets** |
| logo.svg | **Web Assets** |
| Inter.woff2 (or other WOFF/WOFF2) | **Web Assets** |
| PDF brochure | **unsupported** |
| ZIP / archive | **unsupported** |
| Video, audio, HTML, JS, CSS, EXE | **unsupported** |
| Private API credential / secret | **unsupported** — `/m/...` is public |

If the file will be **referenced by application or site code**, it is a Web Asset.
If it is a **temporary share for humans** (issue, PR, Slack, debug), it is a Drop.

## Killer workflow: replace, don't mint a new URL

```text
User: Replace the homepage hero.
→ list_media_assets / get_media_asset
→ replace_media_asset { project_id, asset_id, confirm: true }
→ POST new bytes to the upload intent
→ application URL stays the same
```

Before creating a new semantic asset for an existing role, inspect the project's current assets. If that role already exists, **replace it** so the application URL stays stable.

Do not create `branding/logo-new`, `branding/logo2`, `branding/logo-final`, or `homepage/hero-new` unless the user explicitly wants another independent asset.

If intent is ambiguous ("upload another hero" while `homepage/hero` exists), **ask** rather than silently duplicate.

## Formats

**Web Assets:** JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2.

**Drops:** PNG, JPEG, WebP, GIF only. No SVG.

**Unsupported everywhere:** PDF, video, audio, ZIP/TAR, HTML/JS/CSS/PHP, source, generic blobs, TTF/OTF/EOT, confidential data.

On unsupported: explain once and stop. Do not retry with misleading MIME types. Do not convert/rehost unless the user explicitly asks for a supported file outside DropIMG.

## Tools

### Drops (temporary)

`upload_image` · `get_image` · `list_images` · `delete_image`

`upload_image` takes workspace bytes as base64 / data URL. That flow is Drop-only.

### Web Assets (permanent)

`list_media_projects` · `create_media_project` · `list_media_assets` · `get_media_asset` · `upload_media_asset` · `replace_media_asset`

No `upload_svg` / `upload_font` / `upload_avif`. HTTP ingest detects the type.

## Web Assets write path (mandatory)

Never put Web Asset binaries or base64 in MCP JSON-RPC.

Create:

```text
upload_media_asset { project_id, path }
  → receive upload intent
  → POST file bytes to upload_url
  → read asset.url from HTTP response
  → use asset.url in application code
```

Replace:

```text
list_media_assets / get_media_asset
  → replace_media_asset { project_id, asset_id, confirm: true }
  → POST replacement bytes to returned upload intent
  → leave application URL/code unchanged
```

Without `confirm: true`, replacement is refused. Retry with confirm only when the user asked to replace.

Intents are one-use, ~10 minutes. Expired/replayed intent → mint a fresh one. Do not reuse.

## Stable alias vs immutable version

Use only URLs DropIMG returns. Never invent `/m/...` paths or guess org/project/path from filenames.

### Stable alias

Use the normal `/m/...` asset URL (`url` in JSON) in application code.

Example: `https://dropimg.io/m/acme/site/homepage/hero`

The alias is intentionally mutable. Replacing the asset changes the bytes served at this URL while the URL itself stays the same.

Use it for `<img>`, favicons, CSS references, `@font-face`, and normal application assets.

### Immutable version

Use the versioned URL (`versionUrl`, or `url` + `?v={versionId}`) when the caller needs the exact historical bytes to never change: audit/history, reproducible builds, debugging an old deployment, snapshots, comparing previous versions.

Versioned URLs must remain immutable. Do not strip `?v=`.

### Agent rule

Default to the stable alias for application code.

Use an immutable version URL only when the user explicitly needs fixed historical content or reproducibility.

Do not replace a stable alias with a version URL in normal app code just to avoid caching.

## Project scope

Always pass `project_id`. There is no implicit project.

- Unknown project → `list_media_projects`.
- Still ambiguous → ask the user.
- Account/OAuth can create projects (`create_media_project`).
- Project keys are scoped to one project and cannot create projects.
- Cross-project probing is forbidden.
- Revoked/expired credentials → stop and request valid auth. Do not work around auth.

## Path names (new Web Assets)

Semantic role, no extension required:

Good: `branding/logo` · `branding/logo-dark` · `branding/favicon` · `homepage/hero` · `homepage/feature-grid` · `products/widget/front` · `fonts/inter/regular`

Bad: `file123` · `img1` · `new-logo-final-v7` · `abc827362`

## Format notes

**SVG:** server sanitizes. Scripts, event attributes, `foreignObject`, external loads, unsafe href/xlink, `javascript:`, unsafe `data:` URLs, remote CSS/imports, DTD/entities may be rejected or stripped. Stored bytes may differ from upload. Do not rely on SVG scripting or remote loads.

**Fonts:** WOFF/WOFF2 only. After upload, use returned `asset.url` in `@font-face`. No TTF/OTF/EOT.

**Public aliases** are not secrets. Anyone with the URL can fetch the file. Do not upload confidential data as a Web Asset. Credentials never belong in public URLs. Project keys are private credentials.

## Quotas

Plans cap projects, storage, keys, and monthly deliveries. On `quota_exceeded` (or equivalent):

- Explain the applicable limit.
- Stop the write. Do not retry.
- Do not create duplicate assets, extra projects, extra keys, or alternate paths to evade the quota.
- Suggest upgrading at https://dropimg.io/pricing when appropriate.

Delivery overage does not take live `/m/...` URLs down. Do not rewrite aliases or work around serving policy.

## Errors

| Situation | Agent action |
|---|---|
| Unsupported type | Explain scope and stop |
| Revoked/expired auth | Request valid credentials |
| Project not found | List projects; do not probe IDs |
| Ambiguous project | Ask user |
| Existing semantic role | Replace instead of duplicate |
| Missing replace confirmation | Retry with `confirm: true` only if user requested replace |
| Expired/replayed intent | Request a fresh intent |
| Unsafe SVG | Explain rejection |
| Plan/project/storage/key quota exceeded | Explain the applicable plan limit and stop the write. Do not create duplicates or retry under another path/project to evade the quota. |
