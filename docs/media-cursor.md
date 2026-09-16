# DropIMG Media — Cursor

Permanent **Web Assets** at `/m/{org}/{project}/{path}` for code you are generating (logos, heroes, favicons, illustrations, web fonts). Temporary screenshots still use Drop tools (`upload_image`).

Public aliases are not secret. Anyone with the URL can fetch the file.

Do not invent a `/m/...` URL. Use the `url` from the HTTP upload response or `get_media_asset`.

## Connect

1. Sign in at [dropimg.io/app/media](https://dropimg.io/app/media).
2. Create a project (for example `website`).
3. Create an API key. Copy the `dropimg_pk_*` value once.
4. In Cursor MCP settings, add:

```json
{
  "mcpServers": {
    "dropimg": {
      "url": "https://dropimg.io/mcp",
      "headers": {
        "Authorization": "Bearer dropimg_pk_YOUR_KEY"
      }
    }
  }
}
```

OAuth (Add to Cursor from [dropimg.io/mcp](https://dropimg.io/mcp)) still works for temporary Drops. A project key is required for Media writes scoped to that project.

## Workflow

```
create_media_project (account token / OAuth only)
  → list_media_projects
  → upload_media_asset { project_id, path: "branding/logo" }
  → POST the file bytes to upload_url (do not put bytes in the tool)
  → paste the returned /m/... URL into the codebase
  → replace_media_asset { project_id, asset_id, confirm: true } when the file changes
```

Supported: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2. PDFs, video, audio, archives, and code files are rejected. The HTTP ingest path detects the format — there is no `upload_svg` tool.

Production Media remains disabled (`MEDIA_ENABLED=false`). Use staging or a local Worker with the flag on for this flow.
