# DropIMG Media — Cursor

Permanent **Web Assets** at `/m/{org}/{project}/{path}` for code you are generating (logos, heroes, favicons, illustrations, web fonts). Temporary screenshots still use Drop tools (`upload_image`).

Public aliases are not secret. Anyone with the URL can fetch the file.

Do not invent a `/m/...` URL. Use the `url` from the HTTP upload response or `get_media_asset`.

## Connect

Preferred: install the **DropIMG Web Assets** Cursor plugin (this repository) and complete DropIMG OAuth when Cursor connects to `https://dropimg.io/mcp`. See [cursor-plugin.md](cursor-plugin.md).

OAuth uses the existing production MCP authorization server (`/oauth/register`, `/oauth/authorize`, `/oauth/token`). You should not need to paste a token.

Project keys (`dropimg_pk_*`) are a project-scoped fallback for CI. They cannot create projects. Do not use them as the default Cursor install credential.

## Workflow

```
create_media_project (account / OAuth)
  → list_media_projects
  → upload_media_asset { project_id, path: "branding/logo" }
  → POST the file bytes to upload_url (do not put bytes in the tool)
  → paste the returned /m/... URL into the codebase
  → replace_media_asset { project_id, asset_id, confirm: true } when the file changes
```

If `homepage/hero` or `branding/logo` already exists, replace it. Do not mint `hero-new`.

Supported: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2. PDFs, video, audio, archives, and code files are rejected. The HTTP ingest path detects the format — there is no `upload_svg` tool.

The DropIMG Web Assets skill teaches the agent when to use Drops vs permanent Media. Canonical file: [`.agents/skills/dropimg-web-assets/SKILL.md`](../.agents/skills/dropimg-web-assets/SKILL.md).
