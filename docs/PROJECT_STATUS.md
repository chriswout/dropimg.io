# DropIMG Project Status

Canonical snapshot as of commit `a99df9e` plus the staging-qualification update that follows it. Prefer this file over git history and over [`docs/plans/media-backend-for-ai-websites.md`](plans/media-backend-for-ai-websites.md).

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

This is **staging-qualified Phase 1**, not a production product. There is no media dashboard, no media MCP tools, and production remains flagged off.

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

Verified from live Worker settings and remote D1. **No production deploy was performed during Phase 1A.**

Last production Worker deployment: `2026-09-13T23:00:30Z` (before the media foundation commit). Runtime plaintext vars do **not** yet include `MEDIA_ENABLED`; `mediaEnabled()` is therefore false. Production D1 has **`0012_browser_pairings.sql` applied** and **`0013_media_foundation.sql` still pending**.

Enabled in the last production deploy:

- Billing (PayPal live)
- Long TTL
- Moderation classify **on**, enforce **off** (shadow)
- `PRO_50MB_ENABLED=false`
- `UGC_SHARE_ADS_ENABLED=false`

Keep `MEDIA_ENABLED=false` in [`wrangler.jsonc`](../wrangler.jsonc) `env.production`. Do not deploy production until a durable GitHub Actions token exists and Phase 2 planning is ready.

---

## Current Staging State

Verified from Cloudflare Worker settings, remote D1, and live HTTP.

GitHub Actions run [34975865960](https://github.com/chriswout/dropimg.io/actions/runs/34975865960) succeeded on rerun after Playwright e2e was restored. Staging D1 migrate and Worker deploy both ran.

- Staging Worker deployment: `2026-09-15T13:47:58Z` (version `b37d729d-f9ab-4553-9abc-f3e9e44f4d6f`)
- Runtime flags: `MEDIA_ENABLED=true`, `BILLING_ENABLED=true`, `PAYPAL_ENV=sandbox`, `LONG_TTL_ENABLED=true`, `PRO_50MB_ENABLED=true`, `MODERATION_ENABLED=false`, `MODERATION_ENFORCE=false`, `ENVIRONMENT=staging`
- Unauthenticated `GET /api/v1/media/orgs` returns **401** (flag on), not 404
- Remote D1: **`0012_browser_pairings.sql` and `0013_media_foundation.sql` applied** at `2026-09-15 13:47:46`
- Permanent originals observed at `p/{org}/{project}/{asset}/{version}/original`

---

## Feature Flags

| Flag | Development | Staging runtime | Production runtime | Gates |
|---|---|---|---|---|
| `MEDIA_ENABLED` | `false` | `true` | unset / effectively `false` | `/api/v1/media/*` and `GET /m/*` |
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

Media Phase 1 **in git and soaked on staging**, behind the production flag:

- Migration [`migrations/0013_media_foundation.sql`](../migrations/0013_media_foundation.sql) applied on staging
- Personal org bootstrap, projects, hashed `dropimg_pk_*` keys
- Ingest: inspect → strip → scan → R2 `p/` → D1 (never `images`)
- Stable aliases, immutable versions, `?v=` old version, optimistic alias promote
- Idempotency-Key on create/replace (success only, no TTL)
- Tenant 404 isolation; flag-off 404 tests; quota 5GB / 10MB
- Account delete 409 if the user is the sole owner of an org with live assets
- Account delete revokes project credentials when delete is allowed
- Playwright e2e boots a local Worker without a Cloudflare API token

---

## Milestone

**DropIMG Media — Phase 1 Foundation / Staging Qualified**

It is a soaked foundation, not a shipped product:

- No `/app` media UI, no getting-started docs for agents, no OpenAPI media paths
- No media MCP tools; existing MCP remains drop-only
- No project-key revoke/list API or UI (mint exists; account delete revokes; `DELETE …/keys/:id` returns 405)
- No asset delete/transfer API (`deleted_at` is schema-only) → owners with live assets cannot self-serve account deletion
- Concurrent replace records usage even if the alias pointer loses the race
- Quota is check-then-write (TOCTOU); replace versions accumulate toward 5GB

---

## Known Risks

### Release engineering / deployment reliability

| Rank | Issue |
|---|---|
| HIGH | GitHub Actions had **no** `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repository secrets. The successful staging deploy used a short-lived Wrangler OAuth token placed in Actions so migrate/deploy could run. That token expires quickly. Replace it with a dedicated Cloudflare API token (Workers Scripts Edit + D1 Edit, scoped to this account) via `gh secret set CLOUDFLARE_API_TOKEN`. Keep `CLOUDFLARE_ACCOUNT_ID`. |

### Security

| Rank | Issue |
|---|---|
| HIGH | No media asset delete/transfer. Sole owners with live assets are stuck at account-delete 409. |
| MEDIUM | Public media aliases provide no confidentiality. Knowledge of the URL is sufficient for access. Alias entropy is not an authorization mechanism. |

### Other

| Rank | Issue |
|---|---|
| MEDIUM | Idempotency has no expiry; parallel identical keys can race two creates. Over-long `Idempotency-Key` values are ignored (request proceeds as non-idempotent). |
| LOW | Production moderation is shadow-only. `docs/stripe-underwriting.md` still talks as if `/i/:slug` were the only public URL. |
| INFORMATIONAL | `to_delete.md` existed locally, was **never committed**, and was deleted. No rotation required for that file. Local `*creds*.md` files remain gitignored. |

Isolation (`images` / cron / `o/` vs media tables / `p/`) is **not** a blocker. Cron cannot delete `p/` objects. Media ingest does not insert `images` rows. Staging qualification deleted a temporary drop and the permanent alias continued to serve.

---

## Deployment Status

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

1. Push to `main` → `TARGET=staging`
2. **Unit and integration tests** (`npm test`) — no Cloudflare credentials
3. Local D1 migrate
4. **Playwright e2e** — local Vite/Worker, remote bindings off, no Cloudflare credentials
5. **Remote D1 migrate for TARGET** — uses Actions secrets
6. **Build** — no Cloudflare credentials
7. **Deploy Worker** — uses Actions secrets

Production is `workflow_dispatch` only. Failed e2e still skips migrate/deploy.

Latest successful staging CI: [34975865960](https://github.com/chriswout/dropimg.io/actions/runs/34975865960) (`a99df9e`).

`0013` is:

- Committed
- Exercised in local/integration tests
- **Applied to staging remote D1**
- **Not** applied to production remote D1
- Safe to apply on production while `MEDIA_ENABLED=false`. Do not enable the production flag.

R2 lifecycle JSON has **no** `p/` delete rule. Do not add one.

---

## Current Milestone

**DropIMG Media — Phase 1 Foundation / Staging Qualified**

---

## Next Milestone

**Phase 2 — Developer Experience + Media MCP**

Do not start until a durable GitHub Actions Cloudflare token is in place. Production remains `MEDIA_ENABLED=false`.

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
- Staging: deleting a temporary drop left the permanent `/m/…` alias serving

Local gates for the e2e restore: **50 files, 348 tests, 0 failed**; Playwright e2e **21 passed**; default and `CLOUDFLARE_ENV=staging` builds passed. There is no `lint` script. `npx tsc --noEmit` is not in CI and still fails on pre-existing extension/DOM typing plus wrangler test Response types; it is not a ship gate.
