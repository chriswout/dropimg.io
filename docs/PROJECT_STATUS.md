# DropIMG Project Status

Canonical snapshot of the repository as of commit `60a5b0a` plus the documentation reset that follows it. Prefer this file over git history and over [`docs/plans/media-backend-for-ai-websites.md`](plans/media-backend-for-ai-websites.md).

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

Replacing the file creates a new R2 object and version row. The alias URL does not change. Originals live at `p/{org}/{project}/{asset}/{version}/original`.

This is an **engineering preview**, not a production product. There is no media dashboard, no media MCP tools, and production is flagged off.

---

## Architecture Snapshot

One Cloudflare Worker ([`src/index.ts`](../src/index.ts)): Hono app + OAuth provider wrapping `/mcp`. D1 is the source of truth. R2 stores bytes. KV holds OAuth client state. Cron every 5 minutes expires **temporary** `images` only.

| Plane | Identity | Storage | Delivery | Cleanup |
|---|---|---|---|---|
| Drops | Optional `users.id`; integration tokens `dropimg_it_*` / `dropimg_api_*` | `images` + R2 `o/{24h\|7d\|30d\|pro}/…` | `/:slug.ext`, `/i/:slug`, share `/:slug` | D1 `expires_at` + cron + R2 lifecycle on `o/` prefixes |
| Media | Personal org + project; keys `dropimg_pk_*` | `assets` / `asset_versions` / `asset_aliases` + R2 `p/…/original` | `GET /m/…` | No cron, no R2 delete rule on `p/` |

Auth for humans is passwordless (magic link, Google, GitHub). Billing is PayPal personal Pro. Moderation is Workers AI after metadata strip.

---

## Current Production State

Verified from [`wrangler.jsonc`](../wrangler.jsonc) `env.production` and remote D1 **list** (not a deploy).

Enabled in config:

- Billing (PayPal live)
- Long TTL (Free 1h–30d, Pro +90d/180d)
- Moderation classify **on**, enforce **off** (shadow)
- Direct drop URLs exist in git; they are live on production **only if** a production deploy after `60a5b0a` happened. This reset did **not** deploy production. Last production Worker SHA was not verified from Cloudflare.

Disabled in config:

- `MEDIA_ENABLED=false` → `/api/v1/media/*` and `/m/*` 404
- `PRO_50MB_ENABLED=false`
- `UGC_SHARE_ADS_ENABLED=false`

Remote production D1: **`0013_media_foundation.sql` is pending** (not applied). `0012_browser_pairings.sql` is already applied.

---

## Current Staging State

Intended by `wrangler.jsonc` `env.staging`: `MEDIA_ENABLED=true`, billing sandbox, long TTL, Pro 50MB, moderation off.

**Actual remote status after push `60a5b0a`:** GitHub Actions run [34916800858](https://github.com/chriswout/dropimg.io/actions/runs/34916800858) **failed at Playwright e2e** (`vite` / Cloudflare plugin demanded `CLOUDFLARE_API_TOKEN` to start a remote proxy). Steps after e2e were skipped: **staging D1 migrate did not run, staging Worker did not deploy.**

Remote staging D1 pending: **`0012_browser_pairings.sql` and `0013_media_foundation.sql`**. Staging is behind production on pairing schema.

Do not treat staging as a soak of Phase 1 media until a deploy that applies `0013` actually succeeds.

---

## Feature Flags

| Flag | Development | Staging config | Production config | Gates |
|---|---|---|---|---|
| `MEDIA_ENABLED` | `false` | `true` | `false` | `/api/v1/media/*` and `GET /m/*` |
| `BILLING_ENABLED` | `false` | `true` | `true` | PayPal checkout, sync, portal, Pro CTA |
| `LONG_TTL_ENABLED` | `false` | `true` | `true` | Expiry allowlist beyond legacy 24h |
| `PRO_50MB_ENABLED` | `false` | `true` | `false` | Pro 50MB upload cap |
| `MODERATION_ENABLED` | `false` | `false` | `true` | Post-strip Workers AI classify |
| `MODERATION_ENFORCE` | `false` | `false` | `false` | Hard-block vs shadow |
| `UGC_SHARE_ADS_ENABLED` | `false` | `false` | `false` | Ads on share pages |

Integration tests default `MEDIA_ENABLED=false` ([`wrangler.integration.jsonc`](../wrangler.integration.jsonc)); media suites override to `true`.

---

## Completed

Drops (production product):

- Anonymous and authenticated upload, share, delete, report, admin triage
- Direct `/:slug.ext` plus legacy `/i/:slug`
- Accounts, magic link, Google/GitHub, CSRF origin checks
- PayPal Pro, entitlements, password-protected drops
- Extension (MV3), browser pairing, ShareX adapter
- REST `/api/v1/images`, MCP `upload_image` / `get_image` / `list_images` / `delete_image`
- Cron expiry of `images`; R2 lifecycle on `o/24h|7d|30d|pro/` only

Media Phase 1 **in git**, behind the flag:

- Migration [`migrations/0013_media_foundation.sql`](../migrations/0013_media_foundation.sql)
- Personal org bootstrap, projects, hashed `dropimg_pk_*` keys
- Ingest: inspect → strip → scan → R2 `p/` → D1 (never `images`)
- Stable aliases, immutable versions, `?v=` old version, optimistic alias promote
- Idempotency-Key on create/replace (success only, no TTL)
- Tenant 404 isolation tests; flag-off 404 tests; quota 5GB / 10MB
- Account delete 409 if the user is the sole owner of an org with live assets
- Account delete revokes project credentials when delete is allowed

---

## Engineering Preview

Call this milestone:

**DropIMG Media — Phase 1 Foundation / Engineering Preview**

It is **COMPLETE WITH ISSUES** as a foundation, not as a shipped product:

- No `/app` media UI, no getting-started docs for agents, no OpenAPI media paths
- No media MCP tools; existing MCP remains drop-only
- No project-key revoke/list UI (mint exists; account delete now revokes)
- No asset delete/transfer API (`deleted_at` is schema-only) → owners with live assets cannot self-serve account deletion
- Staging soak has **not** happened (CI never reached migrate/deploy for `60a5b0a`)
- Concurrent replace records usage even if the alias pointer loses the race
- Quota is check-then-write (TOCTOU); replace versions accumulate toward 5GB

---

## Known Risks

| Rank | Issue |
|---|---|
| HIGH | CI e2e on `main` fails before migrate/deploy (Playwright webServer / Vite Cloudflare plugin remote proxy). Recent `main` pushes did not update staging. |
| HIGH | No media asset delete/transfer. Sole owners with live assets are stuck at account-delete 409. |
| MEDIUM | Staging D1 behind production (`0012`+`0013` pending on staging; only `0013` pending on production). |
| MEDIUM | Idempotency has no expiry; parallel identical keys can race two creates. |
| MEDIUM | Public aliases are unauthenticated by design; path is unguessable but not secret. |
| LOW | Production moderation is shadow-only. `docs/stripe-underwriting.md` still talks as if `/i/:slug` were the only public URL. |
| INFORMATIONAL | `to_delete.md` existed locally, was **never committed**, and was deleted. No rotation required for that file. Local `*creds*.md` files remain gitignored. |

Isolation (`images` / cron / `o/` vs media tables / `p/`) is **not** a blocker. Cron cannot delete `p/` objects. Media ingest does not insert `images` rows.

---

## Deployment Status

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

1. Push to `main` → `TARGET=staging`
2. `npm test` → local D1 migrate → `npm run test:e2e` → **remote D1 migrate for TARGET** → build → `wrangler deploy`
3. Production is `workflow_dispatch` only

If e2e fails, migrate and deploy are skipped. That is the current `60a5b0a` outcome.

`0013` is:

- Committed
- Exercised in local/integration tests (`applyD1Migrations`)
- **Not** applied to staging remote D1
- **Not** applied to production remote D1
- Safe to apply on production while `MEDIA_ENABLED=false` (empty tables, routes 404). Do not enable the production flag until soak is real.

R2 lifecycle JSON has **no** `p/` delete rule. Do not add one.

---

## Current Milestone

**DropIMG Media — Phase 1 Foundation / Engineering Preview**

---

## Next Milestone

**Phase 2 — Developer Experience + Media MCP**

Do not start until staging has `0013` applied, media ingest works on staging, and production remains `MEDIA_ENABLED=false`.

### Phase 2 Proposed Scope

Make the existing REST surface usable by humans and agents:

- `/app` project management: create/select personal org + project, mint/revoke/list project keys, copy alias URL, getting-started
- REST examples in site docs (not a second OpenAPI file unless cheap)
- Instructions for Cursor, Claude Code, Codex
- MCP media tools on the **existing** `/mcp` server, gated by `MEDIA_ENABLED`, without changing drop tools

Recommended MCP names (match current `verb_noun` tools `upload_image`, `list_images`, …):

- `list_media_projects`
- `create_media_project`
- `upload_media_asset`
- `replace_media_asset` (require `confirm: true`)
- `get_media_asset`
- `list_media_assets`

Prefer signed upload URLs (or PUT-to-Worker) so agents do not stuff megabytes into MCP JSON-RPC. Keep `project_id` explicit on tools. Accept `dropimg_pk_*` on `/mcp` `resolveExternalToken` in addition to `dropimg_api_*`.

### Explicitly Deferred

Custom domains, teams/seats, SSO, transforms, AVIF pipelines, resize presets, Queues, CDN analytics, usage billing, storage tiers, multi-region, second Worker, Durable Objects, external database, new PayPal SKUs.

---

## Isolation (verified)

- Temporary keys: `r2Key()` → `o/{class}/YYYYMMDD/{id}` ([`src/lib/tokens.ts`](../src/lib/tokens.ts))
- Permanent keys: `permanentOriginalKey()` → `p/…/original` ([`src/lib/media-path.ts`](../src/lib/media-path.ts))
- Cron: `SELECT … FROM images WHERE expires_at` only ([`src/cron/cleanup.ts`](../src/cron/cleanup.ts))
- `removeImage` / account-delete image sweep: `images` only
- Media ingest: `INSERT` into `assets` / `asset_versions` / `asset_aliases` only
- Tests: creating a project does not change `images` count; cron leaves a `p/` object in R2

Local Vitest at this reset: **49 files, 345 tests, 0 failed**. There is no `lint` script. `npx tsc --noEmit` is not in CI and currently fails on pre-existing extension/DOM typing plus wrangler test Response types; it is not a ship gate. GitHub Actions `npm test` on `60a5b0a` passed; `npm run test:e2e` failed before migrate/deploy.
