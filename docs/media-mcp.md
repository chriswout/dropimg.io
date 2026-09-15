# DropIMG Media — MCP

One server: `https://dropimg.io/mcp`. There is no second MCP endpoint.

## Auth

| Token | Media | Drops |
|---|---|---|
| OAuth / `dropimg_api_*` | Yes, across the user’s projects (explicit `project_id`) | Yes |
| `dropimg_pk_*` | Yes, that project only | Missing image scopes |
| Revoked or expired `dropimg_pk_*` | 401 | 401 |
| Media flag off | Project keys are not accepted; Media tools are not registered | Unchanged |

## Tools

| Tool | Notes |
|---|---|
| `list_media_projects` | `project_id`, `project_slug`, `url` |
| `create_media_project` | Account token/OAuth. Slug like `website`. |
| `list_media_assets` | Requires `project_id` |
| `get_media_asset` | `project_id` + `asset_id` |
| `upload_media_asset` | Returns upload URL + headers. No binaries in JSON-RPC. |
| `replace_media_asset` | Requires `confirm: true`. Same public alias. |

Drop tools are unchanged: `upload_image`, `get_image`, `list_images`, `delete_image`.

## Recommended write path

1. Call `upload_media_asset` with `project_id` and `path`.
2. POST image bytes to `upload_url` (`Content-Type: application/octet-stream`) using the intent bearer.
3. Read `asset.url` from the HTTP JSON. That is the stable alias.
4. To replace: `replace_media_asset` with `confirm: true`, then POST bytes to the new intent.

Intents are one-use, 10 minutes, scoped to org/project/operation/path or asset. They do not mint unaudited R2 write URLs.

Public `/m/...` aliases provide no confidentiality.
