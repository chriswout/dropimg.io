# DropIMG Web Assets

Permanent Web Assets for AI-built applications. Coding agents upload and replace images, logos, homepage heroes, product imagery, sanitized SVG, favicons, and WOFF/WOFF2 fonts while the app keeps the same stable `/m/...` URL.

This is the Cursor Marketplace plugin for the production DropIMG MCP at `https://dropimg.io/mcp`. It is not generic blob storage, a CDN replacement, a stock photo service, or video/PDF hosting.

## Why use it

- Permanent app assets with semantic paths (`homepage/hero`, `branding/logo`)
- Stable aliases — replace the file, keep the URL
- Replacement without rewriting application code
- Coding-agent workflow over MCP
- Temporary Drops when you need a disposable screenshot for GitHub, PRs, Slack, or debugging

## Killer workflow

```text
User: Replace the homepage hero.

Cursor
→ finds homepage/hero
→ calls replace_media_asset
→ uploads new bytes
→ stable URL stays unchanged
→ application code does not change
```

## Supported formats

**Media / Web Assets:** JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2.

**Drops (temporary):** PNG, JPEG, WebP, GIF.

**Not supported:** PDF, video, audio, ZIP/TAR, HTML/JS/CSS, source, EXE, TTF/OTF/EOT, arbitrary blobs.

## Install

1. Install **DropIMG Web Assets** from the Cursor Marketplace, or load this repository as a local plugin.
2. Connect MCP. Cursor uses DropIMG's existing OAuth flow against `https://dropimg.io/mcp` (dynamic client registration). Sign in on dropimg.io when prompted.
3. Create a Media project at [dropimg.io/app/media](https://dropimg.io/app/media) if you do not have one yet.

You should not need to paste a token for a normal install.

Project keys (`dropimg_pk_*`) are for project-scoped CI/automation. They cannot create projects and are not the default Cursor install credential.

Account API tokens (`dropimg_api_*`) work as a Bearer fallback if OAuth is unavailable. Do not commit them.

## Tools

Drops: `upload_image`, `get_image`, `list_images`, `delete_image`

Media: `list_media_projects`, `create_media_project`, `list_media_assets`, `get_media_asset`, `upload_media_asset`, `replace_media_asset`

Agent behavior lives in the DropIMG Web Assets skill. Media writes use upload intents — bytes go over HTTP, not JSON-RPC.

## Security

- Public `/m/...` aliases are public. Knowledge of the URL is access.
- Do not store secrets or confidential files as Web Assets.
- SVG is sanitized server-side.
- Project keys and API tokens are private credentials.
- Never invent `/m/{org}/{project}/{path}` — use the URL DropIMG returns.

## Pricing

Free, Developer, and Pro plans: [dropimg.io/pricing](https://dropimg.io/pricing)

## Links

- [dropimg.io](https://dropimg.io)
- [Web Assets](https://dropimg.io/web-assets)
- [Developers](https://dropimg.io/developers)
- [Pricing](https://dropimg.io/pricing)
- [MCP reference](media-mcp.md)
