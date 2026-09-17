# DropIMG Media — MCP

One server: `https://dropimg.io/mcp`. There is no second MCP endpoint.

Media is permanent **Web Assets** for application code. Temporary screenshots, debugging, and tickets use Drop tools.

| Job | Plane | Tool |
|---|---|---|
| Screenshot for a bug report | Drop | `upload_image` |
| Logo used by a website | Media | `upload_media_asset` |
| Hero image in generated code | Media | `upload_media_asset` |
| Favicon | Media | `upload_media_asset` (`path` like `favicon`) |
| Web font (WOFF/WOFF2) | Media | `upload_media_asset` (`path` like `fonts/inter`) |
| PDF download | — | unsupported |
| ZIP / archive | — | unsupported |

The agent must **never invent** a `/m/...` URL. Read the `url` from the HTTP upload JSON or `get_media_asset`.

Supported Media bytes: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2. There are no format-specific tools (`upload_svg`, `upload_font`, …). The HTTP ingest path detects the type.

## Auth

| Token | Media | Drops |
|---|---|---|
| OAuth / `dropimg_api_*` | Yes, across the user’s projects (explicit `project_id`) | Yes |
| `dropimg_pk_*` | Yes, that project only | Missing image scopes |
| Revoked or expired `dropimg_pk_*` | 401 | 401 |

## Tools

| Tool | Notes |
|---|---|
| `list_media_projects` | `project_id`, `project_slug`, `url` |
| `create_media_project` | Account token/OAuth. Slug like `website`. |
| `list_media_assets` | Requires `project_id`. Compact rows include `asset_type` and `mime`. |
| `get_media_asset` | `project_id` + `asset_id` |
| `upload_media_asset` | Returns upload URL + headers. No binaries in JSON-RPC. |
| `replace_media_asset` | Requires `confirm: true`. Same public alias; MIME may change. |

Drop tools are unchanged: `upload_image`, `get_image`, `list_images`, `delete_image`.

Asset responses look like:

```json
{
  "asset_id": "…",
  "path": "branding/logo",
  "url": "https://dropimg.io/m/acme/site/branding/logo",
  "asset_type": "vector",
  "mime": "image/svg+xml"
}
```

## Recommended write path

1. Call `upload_media_asset` with `project_id` and `path` (no file extension required).
2. POST bytes to `upload_url` (`Content-Type: application/octet-stream`) using the intent bearer.
3. Read `asset.url` from the HTTP JSON. That is the stable alias.
4. To replace: `replace_media_asset` with `confirm: true`, then POST bytes to the new intent.

Intents are one-use, 10 minutes, scoped to org/project/operation/path or asset. They do not mint unaudited R2 write URLs.

Public `/m/...` aliases provide no confidentiality.

The canonical agent behavior package is [`.agents/skills/dropimg-web-assets/SKILL.md`](../.agents/skills/dropimg-web-assets/SKILL.md). Integration guides should point there rather than restating the decision table.
