# DropIMG Project Status

Canonical snapshot as of Web Asset Format Expansion (KON-53–KON-58) on `main`. Prefer this file over git history and over [`docs/plans/media-backend-for-ai-websites.md`](plans/media-backend-for-ai-websites.md).

---

## Product Definition

### DropIMG Drops

Temporary image sharing. Paste, drop, or upload a PNG/JPEG/WebP/GIF; get a public link that expires. Anonymous use is first-class. Accounts add My Drops, Pro lifetimes, password protection, extension pairing, ShareX, REST `/api/v1/images`, and MCP drop tools.

Unprotected drops copy a **direct image URL** with the real extension (`https://dropimg.io/{slug}.png`). Password-protected drops still use the extensionless share page so recipients see the unlock form. Legacy `GET /i/:slug` still serves bytes.

Drops do **not** accept SVG, AVIF, ICO, or fonts.

### DropIMG Media

Permanent **Web Asset infrastructure** for AI-built websites and applications. Broader than an image host, narrower than a blob store:

`Organization → Project → Asset → Immutable Version → Stable Alias`

Public alias:

`https://dropimg.io/m/{orgSlug}/{projectSlug}/{path}`

**Public media aliases provide no confidentiality. Knowledge of the URL is sufficient for access. Alias entropy is not an authorization mechanism.**

Replacing the file creates a new R2 object and version row. The alias URL does not change. Originals live at `p/{org}/{project}/{asset}/{version}/original`.

Supported Web Assets: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2.

Explicitly unsupported: PDFs, video, audio, archives, EXE/APK, HTML/JS/CSS/PHP, source, generic blobs. DropIMG is not S3/R2/Vercel Blob.

Phase 2 added `/app/media`, project key list/revoke, asset delete, upload intents, and Media MCP tools on the existing `/mcp` server. This pass adds the Web Asset type model and the approved extra formats. Production remains flagged off.

---

## Architecture Snapshot

One Cloudflare Worker ([`src/index.ts`](../src/index.ts)): Hono app + OAuth provider wrapping `/mcp`. D1 is the source of truth. R2 stores bytes. KV holds OAuth client state. Cron every 5 minutes expires **temporary** `images` only.

| Plane | Identity | Storage | Delivery | Cleanup |
|---|---|---|---|---|
| Drops | Optional `users.id`; integration tokens `dropimg_it_*` / `dropimg_api_*` | `images` + R2 `o/{24h\|7d\|30d\|pro}/…` | `/:slug.ext`, `/i/:slug`, share `/:slug` | D1 `expires_at` + cron + R2 lifecycle on `o/` prefixes |
| Media | Personal org + project; keys `dropimg_pk_*`; MCP intents `dropimg_ui_*` | `assets` / `asset_versions` / `asset_aliases` + R2 `p/…/original` | `GET /m/…` | Soft-delete + immediate R2 delete of that asset’s originals. No cron, no R2 lifecycle on `p/` |

Auth for humans is passwordless (magic link, Google, GitHub). Billing is PayPal personal Pro. Moderation is Workers AI after metadata strip for PNG/JPEG/WebP/GIF only.

---

## Current Production State

**No production deploy is part of this pass.** Keep `MEDIA_ENABLED=false` in [`wrangler.jsonc`](../wrangler.jsonc) `env.production`.

Last production Worker deployment: `2026-09-13T23:00:30Z`. Runtime plaintext vars do **not** include `MEDIA_ENABLED`. Production D1 has **`0012` applied** and **`0013` / `0014` / `0015` still pending**.

---

## Current Staging State

Web Asset Format Expansion is **staging-qualified** on `https://dropimg-staging.christenwout.workers.dev`.

Local OAuth deploy applied `0015_media_web_assets.sql` and Worker version `d279677e-6915-4c3e-a171-3279c27a2f4a` with `MEDIA_ENABLED=true`. Production was not migrated or deployed.

Live checks (account `christenwout+webassets@gmail.com`):

- AVIF → `assetType=image`, alias `Content-Type: image/avif`
- ICO (claimed as PNG) → `assetType=icon`, `Content-Type: image/x-icon` at `/m/…/favicon`
- SVG (claimed as PNG) → `assetType=vector`, SVG CSP + `nosniff`
- WOFF2 (claimed as TTF) → `assetType=font`, `Content-Type: font/woff2`, null width
- Malicious SVG script upload → **422**; Drop `/api/upload` SVG → **415**
- Replace SVG → PNG on `branding/logo`: live alias immediately `image/png`; `?v=` keeps `image/svg+xml`
- `@font-face` from `https://example.com` loaded the staging WOFF2 (`FontFace.status=loaded`, `document.fonts.check('72px DropTest')===true`). Not HTTP 200 alone.
- Production `/api/v1/media/orgs` and `/app/media` remain **404**

Phase 2 qualification (CI [35011165971](https://github.com/chriswout/dropimg.io/actions/runs/35011165971), `0014`) still stands underneath.

---

## Feature Flags

| Flag | Development | Staging runtime | Production runtime | Gates |
|---|---|---|---|---|
| `MEDIA_ENABLED` | `false` | `true` | unset / effectively `false` | `/api/v1/media/*`, `GET /m/*`, `/app/media`, Media MCP tools + `dropimg_pk_*` on `/mcp` |
| `BILLING_ENABLED` | `false` | `true` | `true` | PayPal checkout, sync, portal, Pro CTA |
| `LONG_TTL_ENABLED` | `false` | `true` | `true` | Expiry allowlist beyond legacy 24h |
| `PRO_50MB_ENABLED` | `false` | `true` | `false` | Pro 50MB upload cap |
| `MODERATION_ENABLED` | `false` | `false` | `true` | Post-strip Workers AI classify |
| `MODERATION_ENFORCE` | `false` | `false` | `false` | Hard-block vs shadow |
| `UGC_SHARE_ADS_ENABLED` | `false` | `false` | `false` | Ads on share pages |

---

## Completed

Drops (production product): unchanged. SVG/AVIF/ICO/fonts remain Drop-rejected.

Media Phase 2 (git; staging apply via CI): `/app/media`, project keys, asset delete, idempotency, concurrent replace, upload intents, Media MCP tools.

Web Asset Format Expansion (git; KON-53–57):

- `asset_versions.asset_type` (`image` \| `vector` \| `icon` \| `font`) with DEFAULT `image` for existing rasters
- Authoritative byte inspection (`inspectWebAsset`); client MIME/filename ignored
- AVIF (`image/avif`), ICO (`image/x-icon`), sanitized SVG (`image/svg+xml`), WOFF/WOFF2
- Replace may change MIME on the same extensionless alias
- SVG fail-closed sanitizer (`@xmldom/xmldom`); only sanitized bytes are stored
- SVG delivery CSP + `nosniff`; fonts CORS for `@font-face`
- MCP compact rows expose `asset_type` + `mime`; no format-specific tools
- OpenAPI + REST/Cursor/Claude/Codex/MCP guides updated
- Commits: `f8a69e3` (formats + SVG ingest), `6eb8107` (docs + staging record)

Web Assets agent skill (KON-59):

- Canonical: [`.agents/skills/dropimg-web-assets/SKILL.md`](../.agents/skills/dropimg-web-assets/SKILL.md)
- Decision table Drops vs Media vs unsupported; replace-in-place; no invented `/m/...` URLs

---

## Milestone

**DropIMG Media — Web Asset Format Expansion (KON-53–KON-58)**

Local/CI gates: **55 files, 401 tests, 0 failed** (skill tests included). Staging qualification: **PASS**. Production Media remains off. Do not apply `0013`/`0014`/`0015` to production.

---

## Product decisions (this pass)

| Topic | Decision |
|---|---|
| Taxonomy | Coarse `asset_type` on versions, not one type per MIME |
| ICO MIME | Canonical `image/x-icon` |
| Replace MIME | Allowed. Alias is a role (`branding/logo`), not an extension |
| SVG store | Sanitized form only; input hash may differ from stored hash |
| SVG host | Stay on `dropimg.io/m/...` this pass. Dedicated asset hostname = future hardening |
| AVIF privacy | Container/dimension validation only; no AV1 decode or EXIF strip in the Worker |
| Fonts | WOFF/WOFF2 only (no TTF/OTF/EOT). 2 MB cap. Null width/height |
| MCP | Same four asset tools; HTTP ingest detects format |

---

## Known Risks

### Release engineering / deployment reliability

| Rank | Issue |
|---|---|
| HIGH | GitHub Actions `CLOUDFLARE_API_TOKEN` is still a Wrangler OAuth token, not a dashboard-created API token. Wrangler OAuth cannot mint user API tokens (9109). The stopgap OAuth used for Phase 2 expires `2026-09-15T19:38:26Z`. Creating a durable token requires Cloudflare dashboard login (passkey). CI now fails fast via `wrangler whoami` before migrate/deploy. |

### Security

| Rank | Issue |
|---|---|
| MEDIUM | Public media aliases provide no confidentiality. Knowledge of the URL is sufficient for access. |
| MEDIUM | SVG is served from the application origin. Restrictive CSP + sanitizer mitigate script/network; a dedicated asset hostname is deferred. |
| LOW | AVIF/ICO/font bytes are not metadata-stripped (no practical Worker decoder). |

### Other

| Rank | Issue |
|---|---|
| LOW | Production moderation is shadow-only. |
| INFORMATIONAL | Linear MCP is not connected in this environment; KON-53–KON-58 were not updated from here. |

Isolation (`images` / cron / `o/` vs media tables / `p/`) remains intact. Asset delete does not use temporary `images` cleanup.

---

## Deployment Status

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

1. Push to `main` → `TARGET=staging`
2. Unit and integration tests — no Cloudflare credentials
3. Local D1 migrate
4. Playwright e2e — local Vite/Worker
5. **Verify Cloudflare credentials** (`wrangler whoami`)
6. Remote D1 migrate for TARGET
7. Build
8. Deploy Worker

Production is `workflow_dispatch` only.

`0015` is applied on staging (this pass). `0014` was already applied. Do not apply `0013`/`0014`/`0015` to production.

R2 lifecycle JSON has **no** `p/` delete rule. Do not add one.

---

## Next Milestone

**KON-60 — MCP registry/marketplace packaging** of the existing `/mcp` server plus [`.agents/skills/dropimg-web-assets/SKILL.md`](../.agents/skills/dropimg-web-assets/SKILL.md). Do not add a second MCP endpoint.

Production Media remains **NO-GO**. Mint a durable Cloudflare API token for Actions (KON-41), then a separate production enablement pass (`MEDIA_ENABLED`, D1 `0013`/`0014`/`0015`) only after explicit approval.

### Explicitly Deferred

Custom domains, dedicated asset hostname, teams/seats, SSO, transforms, AVIF decode/strip, TTF/OTF, resize presets, Queues, CDN analytics, usage billing, storage tiers, multi-region, second Worker, Durable Objects, external database, new PayPal SKUs, PDF/video/audio/archives.

---

## Isolation (verified)

- Temporary keys: `r2Key()` → `o/{class}/YYYYMMDD/{id}`
- Permanent keys: `permanentOriginalKey()` → `p/…/original`
- Cron: `SELECT … FROM images WHERE expires_at` only
- Media ingest: `INSERT` into `assets` / `asset_versions` / `asset_aliases` only
- Media delete: media tables + `p/` objects only
- Tests: creating a project does not change `images` count; cron leaves a `p/` object in R2; Drop SVG upload still fails
