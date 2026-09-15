# DropIMG Media — Claude Code

```bash
claude mcp add --transport http dropimg https://dropimg.io/mcp \
  --header "Authorization: Bearer dropimg_pk_YOUR_KEY"
```

Mint the key at [dropimg.io/app/media](https://dropimg.io/app/media) (shown once).

## Tools

Media (when `MEDIA_ENABLED=true`):

- `list_media_projects`
- `create_media_project` (account / `dropimg_api_*` only)
- `list_media_assets`
- `get_media_asset`
- `upload_media_asset` — returns an HTTP upload intent, not image bytes
- `replace_media_asset` — requires `confirm: true`

Drops (unchanged): `upload_image`, `get_image`, `list_images`, `delete_image`.

A project key never sees another project. Pass `project_id` on every Media call.

After `upload_media_asset`, POST the file to `upload_url` with the returned `Authorization` header:

```bash
curl -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer dropimg_ui_…" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @logo.png
```

Put the JSON `url` into the app. Public `/m/...` URLs are not confidential.
