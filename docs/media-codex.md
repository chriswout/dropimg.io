# DropIMG Media — Codex

```bash
codex mcp add dropimg --url https://dropimg.io/mcp \
  --header "Authorization: Bearer dropimg_pk_YOUR_KEY"
```

Create the project and key in [the Media app](https://dropimg.io/app/media).

Media is permanent Web Assets for application code. Drops are temporary screenshots.

Ask the agent to:

1. `list_media_projects` (or create one with an account token)
2. `upload_media_asset` with an explicit `project_id` and `path` such as `branding/logo` or `fonts/inter`
3. POST the file bytes to the returned `upload_url`
4. Use the stable `/m/{org}/{project}/{path}` URL in generated code
5. `replace_media_asset` with `confirm: true` when replacing

Do not send file bytes or base64 through MCP for Media. DropIMG inspects bytes, sanitizes SVG, and accounts storage on the HTTP ingest path.

Supported: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2. PDF/ZIP/video/audio/code are unsupported. Never invent a `/m/...` URL.

See [`docs/media-mcp.md`](media-mcp.md).
