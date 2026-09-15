# DropIMG Project Status

Canonical snapshot as of Phase 2 implementation on `main`. Prefer this file over git history and over [`docs/plans/media-backend-for-ai-websites.md`](plans/media-backend-for-ai-websites.md).

---

## Product Definition

### DropIMG Drops

Temporary image sharing. Paste, drop, or upload a PNG/JPEG/WebP/GIF; get a public link that expires. Anonymous use is first-class. Accounts add My Drops, Pro lifetimes, password protection, extension pairing, ShareX, REST `/api/v1/images`, and MCP drop tools.

Unprotected drops copy a **direct image URL** with the real extension (`https://dropimg.io/{slug}.png`). Password-protected drops still use the extensionless share page so recipients see the unlock form. Legacy `GET /i/:slug` still serves bytes.

### DropIMG Media

Permanent media for AI-built websites and agents. Parallel domain, not a widening of `images`:

`Organization → Project → Asset → Immutable Version → Stable Alias`

Public alias:

`https://dropimg.io/m/{orgSlug}/{projectSlug}/{path}`

**Public media aliases provide no confidentiality. Knowledge of the URL is sufficient for access. Alias entropy is not an authorization mechanism.**

Replacing the file creates a new R2 object and version row. The alias URL does not change. Originals live at `p/{org}/{project}/{asset}/{version}/original`.

Phase 2 adds `/app/media`, project key list/revoke, asset delete, upload intents, and Media MCP tools on the existing `/mcp` server. Production remains flagged off.

---

## Architecture Snapshot

One Cloudflare Worker ([`src/index.ts`](../src/index.ts)): Hono app + OAuth provider wrapping `/mcp`. D1 is the source of truth. R2 stores bytes. KV holds OAuth client state. Cron every 5 minutes expires **temporary** `images` only.

| Plane | Identity | Storage | Delivery | Cleanup |
|---|---|---|---|---|
| Drops | Optional `users.id`; integration tokens `dropimg_it_*` / `dropimg_api_*` | `images` + R2 `o/{24h\|7d\|30d\|pro}/…` | `/:slug.ext`, `/i/:slug`, share `/:slug` | D1 `expires_at` + cron + R2 lifecycle on `o/` prefixes |
| Media | Personal org + project; keys `dropimg_pk_*`; MCP intents `dropimg_ui_*` | `assets` / `asset_versions` / `asset_aliases` + R2 `p/…/original` | `GET /m/…` | Soft-delete + immediate R2 delete of that asset’s originals. No cron, no R2 lifecycle on `p/` |

Auth for humans is passwordless (magic link, Google, GitHub). Billing is PayPal personal Pro. Moderation is Workers AI after metadata strip.

---

## Current Production State

**No production deploy was performed during Phase 2.** Keep `MEDIA_ENABLED=false` in [`wrangler.jsonc`](../wrangler.jsonc) `env.production`.

Last production Worker deployment: `2026-09-13T23:00:30Z`. Runtime plaintext vars do **not** include `MEDIA_ENABLED`. Production D1 has **`0012` applied** and **`0013` / `0014` still pending**.

---

## Current Staging State

Phase 1 soaked on staging. Phase 2 adds migration `0014_media_phase2.sql` (idempotency TTL/scope, `token_prefix`, `media_upload_intents`). Apply on staging via normal main CI. Do not apply to production in this pass.

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

Drops (production product): unchanged.

Media Phase 2 (git; staging apply via CI):

- `/app/media` project workspace (hidden when the flag is off)
- Project keys: create (raw once), list metadata, revoke
- Asset delete: soft-delete asset + alias, delete R2 originals, reverse storage usage
- Idempotency: 1–128 chars, org+project+operation scope, 24h TTL, 400 on malformed/oversized, 409 on operation collision
- Concurrent replace: loser version/R2 removed, not billed
- Upload intents: one-use, 10 minutes, Worker ingest (not raw R2)
- MCP on existing `/mcp`: `list_media_projects`, `create_media_project`, `list_media_assets`, `get_media_asset`, `upload_media_asset`, `replace_media_asset`
- `dropimg_pk_*` accepted on `/mcp` when Media is enabled; scoped to that project
- OpenAPI + REST/Cursor/Claude/Codex/MCP guides

---

## Milestone

**DropIMG Media — Phase 2 Developer Experience + Media MCP**

Local gates: **52 files, 363 tests, 0 failed**; Playwright e2e **21 passed**. Production Media remains off.

---

## Known Risks

### Release engineering / deployment reliability

| Rank | Issue |
|---|---|
| HIGH | GitHub Actions `CLOUDFLARE_API_TOKEN` is still a Wrangler OAuth token, not a dashboard-created API token. Wrangler OAuth cannot mint user API tokens (9109). Creating a durable token requires Cloudflare dashboard login (passkey). CI now fails fast via `wrangler whoami` before migrate/deploy. |

### Security

| Rank | Issue |
|---|---|
| MEDIUM | Public media aliases provide no confidentiality. Knowledge of the URL is sufficient for access. |

### Other

| Rank | Issue |
|---|---|
| LOW | Production moderation is shadow-only. |
| INFORMATIONAL | Linear MCP is not connected in this environment; KON-41–KON-52 were not updated from here. |

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

`0014` is committed and exercised in local tests. Apply to staging via CI. Do not apply to production in this pass.

R2 lifecycle JSON has **no** `p/` delete rule. Do not add one.

---

## Next Milestone

Staging qualification of Phase 2, then a production go/no-go only. Do not enable production Media automatically.

### Explicitly Deferred

Custom domains, teams/seats, SSO, transforms, AVIF pipelines, resize presets, Queues, CDN analytics, usage billing, storage tiers, multi-region, second Worker, Durable Objects, external database, new PayPal SKUs.

---

## Isolation (verified)

- Temporary keys: `r2Key()` → `o/{class}/YYYYMMDD/{id}`
- Permanent keys: `permanentOriginalKey()` → `p/…/original`
- Cron: `SELECT … FROM images WHERE expires_at` only
- Media ingest: `INSERT` into `assets` / `asset_versions` / `asset_aliases` only
- Media delete: media tables + `p/` objects only
- Tests: creating a project does not change `images` count; cron leaves a `p/` object in R2
