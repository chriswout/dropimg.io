# DropIMG Web Assets — Claude Code

```bash
claude mcp add --transport http dropimg https://dropimg.io/mcp \
  --header "Authorization: Bearer dropimg_pk_YOUR_KEY"
```

Mint the key at [dropimg.io/app/media](https://dropimg.io/app/media) (shown once).

Web Assets are permanent files (logos, heroes, favicons, illustrations, web fonts) at a stable `/m/{org}/{project}/{path}`. Temporary screenshots and tickets use `upload_image` (Drops). Never invent a `/m/...` URL.

## Tools

Web Assets:

- `list_media_projects`
- `create_media_project` (account / `dropimg_api_*` only)
- `list_media_assets` — includes `asset_type` and `mime`
- `get_media_asset`
- `upload_media_asset` — returns an HTTP upload intent, not file bytes
- `replace_media_asset` — requires `confirm: true`

Drops (unchanged): `upload_image`, `get_image`, `list_images`, `delete_image`.

A project key never sees another project. Pass `project_id` on every Web Assets call.

After `upload_media_asset`, POST the file to `upload_url` with the returned `Authorization` header:

```bash
curl -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer dropimg_ui_…" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @logo.svg
```

Supported: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2. PDFs, ZIP, video, audio, and code files are rejected.

Put the JSON `url` (stable alias) into the app. Use `?v={version_id}` only when you need immutable historical bytes. Public `/m/...` URLs are not confidential.

The DropIMG Web Assets skill teaches Drops vs Web Assets: [`.agents/skills/dropimg-web-assets/SKILL.md`](../.agents/skills/dropimg-web-assets/SKILL.md).
