# DropIMG as the media backend for AI-built websites

**Status:** plan only. Do not implement until the owner explicitly approves this document.

**Date:** 2026-09-14  
**Scope:** evolve DropIMG from a temporary image-sharing utility into a permanent, AI-native media platform, without discarding the existing product.

---

## 1. Executive architectural verdict

DropIMG is a mature **single-user temporary image host** on one Cloudflare Worker. That stack is the right foundation. It is **not** a media backend yet.

Keep the current product as the free acquisition surface:

- paste/drop → temporary public URL
- anonymous use
- existing expiry options
- Chrome/Edge extension, ShareX, REST `/api/v1`, MCP

Build **production media as a parallel domain**, not by widening `images`.

| Existing (keep) | New (add) |
|---|---|
| Temporary drop: user → `images` row → expire → delete | Organization → project → folder → asset → immutable versions → variants → stable alias → optional custom hostname |

**Do not** turn `images` into a giant table that also stores orgs, versions, domains, transformations, and billing state. Cron (`src/cron/cleanup.ts`) already treats every live `images` row as expirable. Mixing permanent objects into that table would fight `expires_at`, R2 prefix classes (`o/24h|7d|30d|pro`), and `MAX_LIFETIME_SECONDS` (180 days) in `src/lib/entitlements.ts`.

**Do not** introduce a second Worker, an external database, Durable Objects, or microservices in phase 1. The one justified new Cloudflare primitive is **Queues**, for asynchronous variant generation. Everything else stays on the current Worker + D1 + R2 until a measured consistency, CPU, or isolation problem appears.

Smallest safe first slice after approval: **personal organization bootstrap + one project + permanent original assets + DropIMG-hosted stable aliases**, with no custom domains, no teams, no transforms, and `images` untouched.

---

## 2. Current repository architecture map

### 2.1 Runtime

`src/index.ts` is one Worker:

1. Canonicalize `http`/`www` → `https://dropimg.io`
2. Serve `/health`
3. Mount Hono routes
4. Wrap fetch in `@cloudflare/workers-oauth-provider` for `/mcp`
5. Cron every 5 minutes: `runCleanup`

There is **no** Cloudflare Queues, Durable Objects, Hyperdrive, Vectorize, or Cloudflare Images binding in `wrangler.jsonc`.

### 2.2 Route map (Hono)

Mounted in `src/index.ts`:

| Module | File | Role |
|---|---|---|
| API v1 | `src/routes/api-v1.ts` | Bearer REST images CRUD |
| Upload | `src/routes/upload.ts` | Anonymous `POST /api/upload` |
| Events | `src/routes/event.ts` | Allowlisted client analytics |
| Auth | `src/routes/auth.ts` | Magic link + Google/GitHub |
| Billing | `src/routes/billing.ts` | PayPal checkout, portal, webhook |
| Account | `src/routes/account.ts` | `/app`, settings, owned uploads, tokens |
| Images | `src/routes/image.ts` | `/i/:slug` and `/:slug.ext` bytes |
| Delete | `src/routes/delete.ts`, `delete-page.ts` | Bearer delete + `/d/:slug` |
| Report | `src/routes/report.ts` | Abuse reports |
| Admin | `src/routes/admin.ts` | `ADMIN_TOKEN` report queue |
| Integrations | `src/routes/integrations.ts` | Bearer me + upload-intent |
| Pairing | `src/routes/browser-pairing.ts` | Extension one-click connect |
| ShareX | `src/routes/integrations-sharex.ts` | Multipart adapter |
| Share | `src/routes/share.ts` | HTML `GET /:slug` |
| OAuth consent | `src/routes/oauth.ts` | MCP authorization UI |

Static marketing HTML is generated into `public/` / `dist/client` and served via the `ASSETS` binding (`notFound` → `env.ASSETS.fetch`).

### 2.3 Shared write path

All upload surfaces eventually call `createDrop()` (`src/lib/create-drop.ts`) then `storeUploadedImage()` (`src/lib/upload-store.ts`):

1. Entitlements + expiry allowlist
2. `UPLOAD_LIMIT` + `overDailyQuota` (100 / 500 MB / 24h per IP and per user)
3. Programmatic extra bucket for `source IN ('api','mcp')` (`src/lib/programmatic-quota.ts`)
4. Magic-byte inspect (`src/lib/inspect.ts`) — PNG/JPEG/WebP/GIF, SVG reject, 50 MP cap
5. Metadata strip (`src/lib/strip.ts`) — fail-closed
6. Workers AI scan (`src/lib/moderation-hook.ts`) — currently shadow in production
7. R2 put under `o/{class}/{YYYYMMDD}/{uuid}` (`src/lib/tokens.ts` `r2Key`)
8. D1 insert into `images` with unique 8-char slug (`src/lib/slug.ts`)

### 2.4 Identity

Personal `users.id` only (`migrations/0003_accounts_billing.sql`):

- Magic links: `src/lib/auth/magic-link.ts`
- Sessions: `src/lib/auth/session.ts` (`dropimg_session`, ~30 days)
- Google/GitHub: `src/lib/auth/social.ts`, `auth_identities` (`0011`)
- CSRF origin allowlist: `src/lib/auth/csrf.ts`
- Login `next` allowlist: only `/oauth/authorize` and `/connect/browser/:uuid` (`src/lib/auth/next-path.ts`)
- Account delete: `src/lib/account-delete.ts` — cancel PayPal first, then tombstone images, revoke tokens/sessions/identities

Two emails never merge (`docs/auth.md`). That remains correct for personal drops. Organizations will attach memberships to existing `users.id`.

### 2.5 Tokens and MCP

- `dropimg_it_*` for extension/ShareX (`images:write` only)
- `dropimg_api_*` with selectable `images:read|write|delete` (`src/lib/integration-token.ts`)
- MCP tools in `src/lib/mcp-tools.ts`: `upload_image`, `get_image`, `list_images`, `delete_image`
- MCP OAuth props are `{ userId, scopes, tokenId? }` (`src/lib/mcp-server.ts`) — no tenant claim
- `OAUTH_KV` stores OAuth provider state (eventual consistency is acceptable here)

### 2.6 Billing

PayPal REST Subscriptions (`src/lib/billing/paypal.ts`):

- One personal Pro SKU
- `subscriptions` + `billing_events` (idempotent `(provider, event_id)`)
- `resolveEntitlements()` maps PayPal status → `anonymous | free | pro`
- `isProSubscription()` treats `past_due` as still Pro — accidental grace for temporary drops, not a real retention state machine
- Feature flags: `BILLING_ENABLED`, `LONG_TTL_ENABLED`, `PRO_50MB_ENABLED`

Production (`wrangler.jsonc` `env.production`): billing on, long TTL on, 50 MB **off**, moderation shadow (`MODERATION_ENABLED=true`, `MODERATION_ENFORCE=false`).

### 2.7 Tests and CI

- Vitest: `tests/unit` + `tests/integration` (last full local run in this repo: 46 files / 329 tests)
- Playwright e2e + visual (visual **not** in CI)
- `.github/workflows/deploy.yml`: push to `main` deploys **staging**; production is `workflow_dispatch` only — tests, local D1, e2e, remote migrate, build, deploy

No tenant-isolation tests exist. Closest: `tests/integration/account-ownership.test.ts`.

---

## 3. Repository-specific reusable components

Reuse these as-is or with thin adapters. Do not rewrite them.

| Component | Why it survives |
|---|---|
| `inspectImage` / `mimeToExt` | Magic-byte allowlist; no filename trust |
| `stripMetadata` | Fail-closed EXIF/ICC stripping |
| `runPostStripSafetyScan` | Scanner call site; later write production-media states too |
| `createDrop` / `storeUploadedImage` | Temporary product; keep as the drop pipeline |
| `r2Key` + lifecycle classes | Temporary objects only; **new prefix** for permanent |
| `removeImage` / `runCleanup` | Temporary expiry; do not point them at production assets |
| Session + social + CSRF | Same humans sign in to both products |
| `createIntegrationToken` pattern | Hash-at-rest, show-once, revoke |
| `IMAGE_SCOPES` + `tokenHasScope` | Extend the scope vocabulary; keep existing three |
| PayPal webhook idempotency (`billing_events`) | Pattern for all inbound webhooks |
| `entitlementsFor` **idea** | Keep “server-authoritative, never trust the client” — replace the hardcoded `Plan` union |
| Direct URL helpers (`src/lib/image-url.ts`) | Temporary drops; production aliases are a different path grammar |
| Pairing (`src/lib/browser-pairing.ts`) | Extension still connects a **personal** drop token |
| Headers (`imageResponseHeaders`, share CSPs, nosniff) | Copy patterns onto the delivery plane |
| WAF + rate limits | Extend expressions; do not disable Bot Fight Mode |
| Analytics `track()` | New events, same privacy rules (no secrets, no raw tokens) |
| Marketing generator + locales | Reposition copy; keep identity and four locales |

---

## 4. Modules requiring refactoring, and why

Refactor only where a domain boundary is blocked. No cosmetic splits.

| Module | Why | When |
|---|---|---|
| `src/lib/entitlements.ts` | `Plan` is a closed `anonymous\|free\|pro` union. Permanent storage, domains, seats, and transform quotas cannot be expressed. Replace with a **capability map** loaded from config + subscription snapshot. Keep `resolveEntitlements()` as the temporary-drop adapter. | Before first paid permanent SKU |
| `src/lib/integration-token.ts` `IntegrationAuth` | Auth context is `{ userId, tokenId, scopes }`. Production APIs need `{ orgId, projectId, actor }`. Add a new auth type; do not overload this struct until MCP/OAuth props can carry tenant claims. | Phase 2 credentials |
| `src/lib/mcp-server.ts` `McpAuthProps` | Same gap. Additive fields, old tools unchanged. | With MCP expansion |
| `src/lib/account-delete.ts` | Today deletes personal images then tombstones the user. Must also drain org ownership, export windows, and domain detach. Gate delete on “no remaining org owner duties”. | When orgs exist |
| `src/views/account.ts` (~1015 lines) | Settings HTML mixes tokens, billing, identities. Split **only** when adding org/project/billing screens, not before. | Dashboard phase |
| `src/routes/account.ts` (~596 lines) | Same: new `/app/media` routes as a new module, leave existing `/app` My drops. | Dashboard phase |
| `src/lib/billing/paypal.ts` | Catalog is one Pro SKU. Map additional PayPal plan IDs into an entitlement catalog; do not fork a second processor. | Billing phase |
| `marketing/render.ts` / `content.ts` | Repositioning requires new pages; keep homepage uploader. | Website phase |
| `docs/moderation.md` state machine | Documented, not implemented. Production media **must not** go live globally without an explicit content state. Temporary drops can stay reactive until ads/paid acquisition. | Before public production CDN |

**Do not split** `create-drop.ts` or `upload-store.ts` unless a second write path (permanent ingest) would otherwise copy-paste inspect/strip/scan. Extract a shared `ingestOriginalBytes()` helper used by both pipelines — that is a domain split, not cosmetics.

---

## 5. New components that must be built

Logical modules on the **same Worker** unless noted:

1. `src/lib/tenancy/` — org/project membership resolution, `requireOrgRole`, `requireProjectAccess`
2. `src/lib/media/` — assets, versions, aliases, folders; never imports `images.expires_at`
3. `src/lib/media/ingest.ts` — inspect/strip/scan/hash/store original under `p/` prefix
4. `src/lib/media/promote.ts` — atomic alias retarget (`UPDATE … WHERE current_version_id = ?`)
5. `src/lib/media/presets.ts` — named transform catalog
6. `src/lib/media/export.ts` — zip/manifest generation
7. `src/lib/domains/` — hostname attach, TXT verification, TLS state
8. `src/lib/usage/` — append-only ledger + rollup
9. `src/lib/entitlement-catalog.ts` — configurable capabilities (JSON/config, not schema prices)
10. `src/lib/lifecycle/` — org/project billing states (active → grace → read-only → suspended → retained → delete)
11. `src/routes/media-api.ts` — `/api/v1/orgs…` (versioned, additive)
12. `src/routes/media-delivery.ts` — `GET` on media hostnames / `/m/:project/:alias`
13. Queue consumer — variant jobs (new binding; same script is allowed)
14. Dashboard views for library, domains, usage
15. MCP tools + Cursor skill pack for audit/migrate/rewrite
16. Webhook dispatcher with signed deliveries and retries

---

## 6. Gap analysis

| Required capability | Today | Gap |
|---|---|---|
| Temporary uploader | Complete | Keep |
| Permanent assets | Forbidden by `MAX_LIFETIME_SECONDS` and marketing (“No permanent archive”) | New tables + R2 prefix **without** bucket expiry |
| Versions / replace-in-place URL | One `r2_key` per row; extend copies for Pro prefix only (`moveImageToProPrefix`) | Immutable versions + alias pointer |
| Folders / search | Flat My drops, slug list | Folders + metadata search |
| Responsive variants | None | Preset pipeline + queue |
| Custom media domain | Only `dropimg.io` / `www` custom domains | SSL for SaaS / custom hostnames |
| Organizations / roles | Personal `user_id` | Tenancy layer |
| Project-scoped keys | User-scoped tokens | New credential kind |
| Usage metering | Rolling COUNT/SUM on `images` | Ledger |
| Failed-payment retention | `past_due` still Pro for drops | Explicit lifecycle for production media |
| Export / no lock-in | None | Export job |
| Agent website migration | MCP uploads temporary URLs | Project tools + repo rewrite skill |
| Ops: queues, DLQ, backups tested restore | Cron only | Add with media jobs |
| Tenant isolation tests | None | Mandatory from first media table |

---

## 7. Target architecture

```
                    ┌─────────────────────────────────────┐
 Control plane      │  dropimg.io Worker (Hono)           │
 (cookie, API, MCP) │  auth, orgs, projects, ingest,      │
                    │  billing, webhooks, dashboard       │
                    └──────────────┬──────────────────────┘
                                   │ D1 (source of truth)
                                   │ R2 originals under p/
                                   │ Queue: media-transform
                                   ▼
                    ┌─────────────────────────────────────┐
 Delivery plane     │  Same Worker, separate route tree   │
                    │  media.dropimg.io                   │
                    │  media.customer.com (custom host)   │
                    │  cacheable GET, no session writes   │
                    └─────────────────────────────────────┘

 Temporary plane    │  Unchanged: /api/upload, /:slug,    │
                    │  /:slug.ext, o/ prefixes, cron      │
```

**Logical** control vs delivery split is required (different cache, auth, abuse posture). **Physical** split into two Workers is excluded until:

- delivery CPU/isolate pressure is measured, or
- a custom-hostname blast radius must be isolated from control-plane deploys

Default: one Worker, two route trees, hostname-based dispatch in `src/index.ts` before Hono.

---

## 8. Control-plane and delivery-plane flows

### 8.1 Temporary drop (unchanged)

Already implemented: inspect → strip → scan → `o/{class}/…` → `images` → serve `/i/:slug` or `/:slug.ext` → cron tombstone.

### 8.2 Permanent ingest

1. Authenticated actor with `media:write` on a project
2. Idempotency-Key on the create/replace request
3. `ingestOriginalBytes()`: inspect, strip, scan, content-hash
4. Store original at `p/{org_id}/{project_id}/{asset_id}/{version_id}/original`
5. Insert `asset_versions` row `status=uploaded|processing`
6. Enqueue named preset jobs (later phases)
7. If first version: create `assets` + `asset_aliases` (`current_version_id`)
8. If replace: do **not** flip the alias until processing succeeds

### 8.3 Replace without changing the public URL

Example: `https://media.customer.com/website/header`

1. Resolve hostname → project (unique hostname)
2. Resolve alias `website/header` → asset
3. Upload new version (new R2 object; never overwrite previous key)
4. Validate + process + generate required presets
5. `UPDATE asset_aliases SET current_version_id = ? WHERE alias_id = ? AND current_version_id = ?` (expected previous)
6. Purge CDN cache for the alias URL (and `?v=` optional)
7. Previous version remains readable at versioned URL and for rollback

### 8.4 Delivery GET

1. Identify host (DropIMG media host vs verified custom hostname)
2. If org lifecycle is `delivery_suspended` or worse → neutral 451/410/503 per policy (not a DropIMG ad)
3. Resolve alias → current version → variant (default: original or `hero`/`srcset` negotiated later)
4. Authz: public alias vs private (phase 1: public production assets only)
5. Stream from R2 with long cache (`immutable` for versioned URLs; shorter + purge for aliases)
6. `X-Robots-Tag` default `noindex, noimageindex` unless the project explicitly opts into indexing (owner decision)

---

## 9. Proposed database schema

All new. **No ALTER that redefines `images` as permanent.** Additive migrations only.

Conventions:

- TEXT UUID primary keys
- INTEGER Unix seconds
- Every org-owned table has `org_id` (denormalized) **and** a FK path to org
- Soft-delete via `deleted_at` unless noted
- Never store raw tokens; hash only

### 9.1 Organizations and people

**`organizations`**

- `id` PK
- `slug` UNIQUE (URL key)
- `name`
- `billing_customer_id` nullable (PayPal customer)
- `lifecycle_status` (`active|grace|read_only|delivery_suspended|retained|scheduled_delete|deleted`)
- `lifecycle_changed_at`, `grace_until`, `delete_after`
- `created_at`, `deleted_at`

**`organization_memberships`**

- `id` PK
- `org_id` FK
- `user_id` FK `users(id)`
- `role` (`owner|admin|developer|viewer|billing`)
- `created_at`, `revoked_at`
- UNIQUE `(org_id, user_id)` WHERE `revoked_at IS NULL`

**`invitations`**

- `id` PK
- `org_id` FK
- `email_norm`, `role`, `token_hash` UNIQUE
- `invited_by` FK users
- `expires_at`, `accepted_at`, `revoked_at`

Bootstrap: first time a user creates a project, create a personal org (`slug` derived from user) with that user as `owner`. Do not require a company name on day one.

### 9.2 Projects and folders

**`projects`**

- `id` PK
- `org_id` FK
- `slug` UNIQUE per org `(org_id, slug)`
- `name`, `created_at`, `archived_at`, `deleted_at`

**`folders`** (path collections)

- `id` PK
- `org_id`, `project_id` FKs
- `parent_id` nullable FK folders
- `name`
- UNIQUE `(project_id, parent_id, name)` among live rows
- `deleted_at`

### 9.3 Assets, versions, variants, aliases

**`assets`**

- `id` PK
- `org_id`, `project_id`, `folder_id` nullable
- `name` (display)
- `created_by` user_id
- `deleted_at`
- Search helpers: `name_norm`, optional `alt_text`

**`asset_aliases`** (stable logical URL)

- `id` PK
- `org_id`, `project_id`, `asset_id`
- `path` (e.g. `website/header`) — UNIQUE `(project_id, path)` live
- `current_version_id` FK asset_versions
- Mutable pointer; the only row rewritten on promote

**`asset_versions`** (immutable after `ready`)

- `id` PK
- `org_id`, `asset_id`
- `r2_key` (original)
- `sha256`, `mime`, `byte_size`, `width`, `height`
- `status` (`uploading|processing|ready|failed|superseded`)
- `created_by`, `created_at`
- `failed_reason` nullable
- No in-place overwrite of `r2_key`

**`asset_variants`**

- `id` PK
- `version_id` FK
- `preset_id`
- `r2_key`, `mime`, `byte_size`, `width`, `height`
- `status` (`queued|ready|failed`)
- UNIQUE `(version_id, preset_id)`

**`transformation_presets`**

- `id` PK (stable string: `thumb|small|medium|large|hero|avif-large|webp-large`)
- `org_id` nullable (null = system)
- JSON `spec` (format, max edge, quality)
- `created_at`
- Not user-arbitrary width/height query params

### 9.4 Domains

**`custom_domains`**

- `id` PK
- `org_id`, `project_id` (exactly one project)
- `hostname` UNIQUE among live+pending (prevent takeover)
- `status` (`pending_dns|pending_ssl|active|suspended|removing`)
- `txt_token_hash`, `verified_at`
- `cf_custom_hostname_id` (Cloudflare SSL for SaaS)
- `created_at`, `deleted_at`

### 9.5 Credentials

**`project_credentials`** (distinct from `integration_tokens`)

- `id` PK
- `org_id`, `project_id`
- `token_hash` UNIQUE
- `prefix` `dropimg_pk_` (project key)
- `scopes` JSON (new media scopes)
- `created_by`, `last_used_at`, `revoked_at`, `expires_at` nullable
- `label`

Keep `integration_tokens` for extension/ShareX/temporary API. Do not store org_id on those rows in phase 1.

### 9.6 Usage, audit, webhooks

**`usage_events`** (append-only)

- `id` PK
- `org_id`, `project_id` nullable
- `meter` (`storage_original_bytes`, `storage_variant_bytes`, `uploads`, `transforms`, `api_ops`, `delivery_bytes` if available)
- `delta` INTEGER (can be negative on delete)
- `idempotency_key` UNIQUE
- `occurred_at`, `source` (`api|mcp|system|webhook`)
- `ref_type`, `ref_id`

**`usage_rollups`**

- `(org_id, meter, period_start)` PK
- `value`
- Rebuilt from events; never the only source of truth

**`audit_events`**

- `id` PK
- `org_id`, `actor_user_id` nullable, `actor_credential_id` nullable
- `action`, `target_type`, `target_id`, `payload_json` (no secrets)
- `created_at`, `request_id`

**`webhook_endpoints`** / **`webhook_deliveries`**

- Endpoint: org-scoped URL, secret hash, event types, `disabled_at`
- Delivery: `event_id`, attempts, status, next_retry, response_code

### 9.7 Billing accounts

Keep `subscriptions.user_id` for personal Pro (temporary product).

Add **`organization_subscriptions`**:

- `id` PK
- `org_id` UNIQUE live
- `provider`, `provider_subscription_id` UNIQUE
- `status`, `price_id`, `current_period_end`, `cancel_at_period_end`
- `entitlement_tier` (string key into catalog, not a CHECK of prices)
- `created_at`, `updated_at`, `provider_occurred_at`

Reuse `billing_events` for PayPal idempotency.

### 9.8 Jobs

**`media_jobs`**

- `id` PK
- `org_id`, `type` (`transform|export|domain_verify|purge`)
- `payload_json`, `status`, `attempts`, `run_after`, `locked_at`
- `last_error`

Queue message id should match `media_jobs.id` for idempotency.

### 9.9 Indexes (minimum)

- `memberships (user_id, org_id)` live
- `projects (org_id, slug)`
- `aliases (project_id, path)`
- `versions (asset_id, created_at)`
- `domains (hostname)`
- `usage_events (org_id, occurred_at)`
- `audit_events (org_id, created_at)`
- `credentials (token_hash)`

### 9.10 Existing-table compatibility

- `images`, `users`, `sessions`, `integration_tokens`, `subscriptions` **unchanged in meaning**
- `users` remains the human identity table
- Optional later: `images.claimed_into_asset_id` — **out of scope until an owner asks to promote a drop into a library**
- Cron continues to select only `images` with `expires_at <= now`

### 9.11 Migration order

1. `organizations`, `memberships` (no product routes yet)
2. `projects`, `folders`
3. `assets`, `versions`, `aliases` (originals only)
4. `project_credentials`, media scopes
5. `usage_events`, `audit_events`
6. `media_jobs` + Queue binding
7. `presets`, `variants`
8. `custom_domains`
9. `organization_subscriptions` + catalog
10. `webhooks`, export jobs, lifecycle columns if not in (1)

Each migration is additive and rollback = stop using new tables (forward-only D1).

---

## 10. API design

Keep `/api/v1/images` exactly as `src/routes/api-v1.ts` + `public/openapi/v1.yaml`. Temporary semantics, user-owned, expiring.

Add **`/api/v1/media/...`** (or `/api/v1/orgs`) with a compatibility policy:

- Additive fields are non-breaking
- Breaking changes require `/api/v2`
- Sunset documented, not silent

### 10.1 Resources (phase-gated)

| Resource | Example |
|---|---|
| Orgs | `POST /api/v1/orgs`, `GET /api/v1/orgs/:org` |
| Members / invites | `/orgs/:org/members`, `/invites` |
| Projects | `/orgs/:org/projects` |
| Folders | `/projects/:proj/folders` |
| Assets | `/projects/:proj/assets` |
| Versions | `POST /assets/:id/versions` (replace) |
| Aliases | `/projects/:proj/aliases/:path` |
| Variants | `GET /versions/:id/variants` |
| Domains | `/projects/:proj/domains` |
| Usage | `GET /orgs/:org/usage` |
| Exports | `POST /projects/:proj/exports` |
| Webhooks | `/orgs/:org/webhooks` |

### 10.2 Cross-cutting

- **Idempotency-Key** required on POST/PUT that create versions, domains, exports
- Cursor pagination (`created_at,id`) like `listOwnedLiveImages`
- Structured errors: `{ error, code }` — extend codes (`forbidden`, `quota_exceeded`, `not_found`, `conflict`, `processing`, `domain_unverified`)
- **Request ID**: generate `crypto.randomUUID()`, return `X-Request-Id`, store on audit/jobs
- Project keys: `Authorization: Bearer dropimg_pk_…`
- Bulk: `POST /projects/:proj/assets:batch` later; not phase 1
- OpenAPI: new file `public/openapi/v1-media.yaml` so temporary spec stays honest

---

## 11. MCP and Cursor-plugin design

### 11.1 One hosted backend

Continue a **single** DropIMG MCP server (`/mcp` in `src/index.ts`). Do not ship a second MCP process. Clients: Cursor, Claude Code, ChatGPT, Copilot, anything that speaks MCP + OAuth or API keys.

Existing four tools remain, documented as **temporary drops**.

### 11.2 New tools (permanent)

All require project-scoped auth (OAuth props later include `orgId`/`projectId`, or a `select_project` tool that binds a session — prefer explicit `project_id` arguments to avoid cross-tenant accidents).

| Tool | Job |
|---|---|
| `media_list_projects` | List caller’s projects |
| `media_create_project` | Create project in personal org |
| `media_audit_repo_images` | Accept a file list / glob report from the agent; classify local vs remote |
| `media_upload_asset` | Permanent original |
| `media_replace_asset` | New version, same alias |
| `media_search_assets` | Name/path search (“restaurant logo”) |
| `media_list_variants` | Preset URLs |
| `media_export_project` | Start export; poll |
| `media_rewrite_plan` | Return a rewrite manifest (old path → new URL) — **does not write the repo** |

Destructive tools (`delete`, `replace`, `domain_remove`) require a `confirm: true` argument. Agents must show the user the plan first.

### 11.3 Cursor plugin (repo-side pack)

Not a second backend. A **skill + rules + commands** package that calls the hosted MCP:

1. **Skill:** “DropIMG media migration”
2. **Rule:** never commit binaries under `/public` that have a DropIMG alias; never rewrite without a manifest
3. **Commands:**
   - Audit repository images
   - Create project for this website
   - Upload and optimize
   - Replace header without changing URL
   - Rewrite references and verify build
   - Export project
4. **Safety:**
   - Dry-run manifest (JSON) checked in or shown
   - User confirmation before rewrite
   - Rollback = re-apply previous manifest (keep local git)
5. **Build verify:** run the project’s existing test/build; DropIMG does not invent a generic site builder

MCP tool abuse controls: same `MCP_LIMIT` (30/min), project quotas, and `images:write`-style media scopes. Base64 upload of whole sites is the wrong shape — prefer signed upload URLs (R2 multipart or Worker PUT) so agents do not embed megabytes in tool args. That upload-URL pattern is a **phase 2** requirement before bulk migration.

---

## 12. Authorization and tenant-isolation model

### 12.1 Central helper

```
requireProject(c, { projectId, need: "media:write" })
  → { org, project, membership | credential, entitlements }
```

Implemented once in `src/lib/tenancy/authorize.ts`. Routes call it; they do not compare `role === "admin"` inline.

Roles → capabilities (config table, not scattered ifs):

| Role | Typical caps |
|---|---|
| Owner | All, including delete org, transfer ownership |
| Administrator | Members, domains, credentials, not billing-destroy |
| Developer/editor | Read/write media, no members/domains billing |
| Viewer | Read |
| Billing manager | Billing + usage, no media write |
| Service credential | Only scopes minted on the key |

### 12.2 Isolation rules

- Every SELECT/UPDATE/DELETE on org data includes `org_id = ?` from the authorized context, not from the client body
- Credential hashes resolve to `project_id`; a key cannot be used on another project even if the attacker guesses IDs
- Tests: user A token cannot GET user B asset by UUID (`tests/integration/media-tenancy.test.ts`) — **required in the first phase that ships assets**
- Ownership transfer: two-step (appoint + accept), audit log
- Membership removal: revoke project credentials created by that user (or all org credentials — owner decision; recommend revoke **that user’s** keys only)
- Invitation tokens hashed, TTL, single use

### 12.3 Hono fit

Middleware that sets `c.set("authz", …)` after Bearer/session resolution. Fail closed: missing authz → 401. Wrong tenant → 404 (do not leak existence) for media objects; 403 for explicit org admin actions.

---

## 13. Media transformation pipeline

### 13.1 Principles

- Original preserved at version R2 key
- Strip metadata on ingest (reuse `stripMetadata`)
- Content-hash stored; optional per-project dedup of **bytes** (still new version rows if alias history needs it)
- Named presets only: `thumb`, `small`, `medium`, `large`, `hero` × formats `avif`, `webp`, `jpeg|png` fallback
- No public `?w=9999&h=9999` API in v1
- Cardinality cap: presets × formats listed in catalog; refuse extra
- Status on `asset_variants`; retries via queue; DLQ → `media_jobs.failed` + alert
- Versioned URLs immutable (`Cache-Control: public, max-age=31536000, immutable`)
- Alias URLs: `max-age=60`–`300` plus purge on promote (same order of magnitude as today’s `IMAGE_CACHE_SECONDS = 300` unless measurements say otherwise)

### 13.2 Where to transform

**Do not** run AVIF/WebP generation on the upload request (Workers CPU/time; current moderation already occupies the request).

Phase order:

1. Originals only (no variants)
2. Queue consumer using a constrained library or **Cloudflare Image Resizing** on first miss, then persist to R2 (evaluate cost in an owner decision)
3. Failed jobs retry with backoff; operator replay

Cloudflare Images (hosted) is **not** assumed. Justify only if resizing cost < Worker+R2 encode cost. Default recommendation: **R2 originals + Image Resizing with allowlisted presets + persist**, to avoid unbounded on-the-fly CPU.

### 13.3 Cost controls

- Entitlement: max variants per month, max original GB, max projects
- Reject ingest if org storage rollup would exceed quota
- Transform meter from `usage_events` with idempotency per `(version_id, preset_id)`

---

## 14. Custom-domain architecture

Higher paid tier (Developer/Agency). Not in first implementation phase.

Use **Cloudflare for SaaS / Custom Hostnames** against a fallback origin (`media.dropimg.io` or the same Worker).

Flow:

1. Customer adds hostname, attached to **one** project
2. UI shows CNAME to DropIMG fallback + TXT ownership record
3. Worker stores `pending_dns`; periodic job or API poll verifies TXT
4. Create Cloudflare custom hostname; wait for TLS `status=active`
5. Delivery: `Host: media.customer.com` → D1 lookup `custom_domains.hostname` → project
6. Hostname UNIQUE globally (live+pending) — **domain takeover prevention**
7. Removal: disable DNS lookup first, then delete custom hostname, then free UNIQUE
8. Suspension: `status=suspended` (abuse or billing) → delivery plane returns neutral error
9. Misconfig: keep serving DropIMG host URLs; custom host 421/526 mapped to a status page
10. Analytics: per-hostname request counts via existing AE `track` + later Logpush if needed
11. Limits: entitlement `max_custom_domains`

Fallback origin must **not** be a customer-controlled IP. Do not document bringing-your-own-origin.

---

## 15. Billing and usage model

### 15.1 Catalog (configurable)

Store tiers in config (`src/lib/entitlement-catalog.ts` + env plan IDs), **not** CHECK constraints of dollar amounts.

Provisional commercial mapping (owner-adjustable):

| Tier | Approx price | Permanent media | Custom domain | Teams |
|---|---|---|---|---|
| Free | $0 | Temporary + optional tiny trial (e.g. 50 MB / 20 assets, flag-gated) | No | No |
| Pro | ~$2.99 | ~5 GB, folders, DropIMG URLs, short history | No | No |
| Developer | ~$9.99–$14.99 | More GB/projects, custom domain, more transforms, longer history | 1 | Maybe 1–2 seats |
| Agency | ~$29–$49 | Multi-project, multi-domain, members, audit, larger quotas | Multiple | Yes |

Existing PayPal personal Pro **continues to mean temporary-drop Pro** (90/180d, passwords, history) until the owner decides whether to **grandfather** it into a permanent-media SKU. **Recommended default:** keep current Pro as “temporary Pro”; sell permanent media as new PayPal plan IDs on `organization_subscriptions`. Do not silently convert storage promises.

### 15.2 Entitlement keys (examples)

`temp_upload_bytes`, `temp_expiry_choices`, `perm_storage_bytes`, `perm_projects`, `perm_members`, `perm_domains`, `perm_transforms_month`, `perm_version_history`, `mcp_daily_ops`, `api_daily_ops`

`resolveEntitlements()` stays for drops. `resolveOrgEntitlements(orgId)` is new.

### 15.3 Metering

Append `usage_events` with idempotency keys. Nightly (cron) reconcile rollups vs events vs R2 inventory samples. Never let a single INTEGER counter be the only billing truth.

Delivery bytes: not available cheaply today (Worker streams R2). Phase 1: omit delivery metering or sample via Analytics Engine. Do not block launch on byte-accurate CDN billing.

### 15.4 PayPal

Add plan IDs in `wrangler.jsonc` vars. Webhook `upsert` writes `organization_subscriptions` when `custom_id` / metadata names an `org_id`. Until that metadata exists, do not guess.

---

## 16. Failed-payment and retention lifecycle

**Do not** delete, watermark, or swap production images on the first failed payment.

| State | Delivery | Uploads / replace / transforms | Notes |
|---|---|---|---|
| `active` | Normal | Normal | |
| `grace` | Normal | Normal | Retry PayPal; email; `grace_until` |
| `read_only` | Normal | Disabled | After disclosed grace |
| `delivery_suspended` | Neutral unavailable (no ads) | Disabled | After disclosed suspend window |
| `retained` | Suspended | Disabled | Export still allowed |
| `scheduled_delete` | Suspended | Disabled | `delete_after` set; export nag |
| `deleted` | 404/410 | — | After export window |

Distinguish reasons: `payment_failed`, `voluntary_cancel`, `account_delete`, `abuse`, `legal`. Abuse/legal may skip grace.

Voluntary cancel: keep `active` until `current_period_end` (mirrors today’s `canceled` + future `current_period_end` in `isProSubscription`).

Account delete (`deleteUserAccount`): cannot proceed if user is sole owner of an org with production assets — must transfer or schedule org deletion.

Export before permanent deletion: originals + retained versions + metadata + folder tree + alias→filename CSV/JSON. Zip in R2, signed download, TTL.

Placeholder if a response is required while suspended: generic “media unavailable”, **not** DropIMG marketing.

---

## 17. Website / dashboard redesign

### 17.1 Positioning

Keep the uploader **above the fold**. Reposition the company:

- **DropIMG — the media backend for AI-built websites.**
- Support: **Your AI writes the code. DropIMG handles the media.**

Avoid generic AI-gradient landing pages. Reuse current chrome (`marketing/chrome.ts`, brand logos, four locales).

### 17.2 Suggested IA

1. Product positioning (new hero copy around the existing dropzone)
2. Instant uploader (existing `renderHome` / `client/main.ts`)
3. Cursor / MCP demonstration (evolve `marketing/mcp.ts` + developers)
4. Permanent media library
5. Optimization / responsive variants
6. Stable URLs and replace-without-changing-URL
7. Custom Media Domains
8. Framework / API integrations
9. Security and reliability
10. Pricing (temporary Pro vs media tiers)
11. Developer documentation (OpenAPI + MCP)

### 17.3 App UX

- `/app` remains **My drops** (temporary)
- `/app/media` (new) is the library: projects, folders, aliases, usage
- `/app/integrations` stays token minting; add project keys as a second card
- Simple surfaces: upload, copy URL, replace, folders. Hide versions until “History”

---

## 18. Operational architecture

| Need | Plan |
|---|---|
| Structured logs | JSON via `console.log` with `request_id`, `org_id`, `route`; no tokens |
| Correlation IDs | `X-Request-Id` on all media API/delivery |
| Error monitoring | Workers Observability is already on (`wrangler.jsonc` `observability.enabled`). Add exception breadcrumbs on job failures |
| Health | `/health` today is liveness only. Add `/health/deps` (optional, auth) that D1 `SELECT 1` + R2 head of a canary — not public to avoid probing |
| Background | Cron keeps drop cleanup. Add cron ticks for job reclaim, domain verify, usage rollup, webhook retry |
| Queues | `media-transform` + dead-letter queue; idempotent consumers |
| D1 backups | Documented `wrangler d1 export` (already in `docs/launch.md`). **Add a quarterly restore drill** to staging |
| R2 reconcile | Weekly sample: `asset_versions.r2_key` vs `head`; alert on missing |
| Billing reconcile | Compare `billing_events` vs PayPal API vs `organization_subscriptions` |
| Status page | External (existing or Cloudflare); not in-Worker until needed |
| Secret rotation | Same as today (`wrangler secret put`); project keys user-revocable |
| Deps | `npm audit` in CI (new step; not present in `deploy.yml`) |
| Load tests | k6 or similar against staging ingest + delivery; not production |
| DR | RPO: D1 export cadence (owner: daily recommended); RTO: redeploy Worker + restore D1 to staging then promote |
| Privacy | Production assets are customer data; retention = lifecycle; drops stay 180d max |
| Moderation | Temporary: keep shadow until enforce criteria in `docs/moderation.md`. Permanent public aliases: require `approved` (or equivalent) before CDN — implement the documented state machine **for media**, even if drops stay reactive |

---

## 19. Security and abuse threat model

| Threat | Mitigation |
|---|---|
| Cross-tenant access | Central authz + `org_id` on every query + tenancy tests |
| Stolen credentials | Hash at rest, revoke, short-lived pairing already proven (`browser-pairing.ts`); project keys show-once |
| Malicious uploads | Inspect allowlist, strip, AI scan, size caps, no SVG |
| MIME confusion | Magic bytes + extension match (`extensionMatchesMime`) |
| Malware | Not a binary host; image allowlist only. Keep it that way in v1 (no PDF/video) |
| Transformation abuse | Named presets, quotas, no arbitrary resize |
| Request/bandwidth abuse | WAF + existing rate limits; extend to media host paths |
| Hotlinking | Optional later: referrer policy per project; default public |
| Custom-domain takeover | Global unique hostname + TXT proof + don’t activate TLS before verify |
| Billing manipulation | Webhook signatures (`verifyPaypalWebhook`), idempotent events |
| Webhook replay | Event id uniqueness + timestamp skew (copy PayPal 300s window pattern in `src/lib/billing/verify.ts`) |
| MCP/tool abuse | Scopes, rate limits, confirm flags, upload URLs not huge base64 |
| Destructive agents | Manifest + confirmation; no implicit delete |
| Moderation/legal | Admin remove path exists for drops (`removeImage` reason `moderation`); clone for assets with audit |
| Cache poisoning aliases | Purge on promote; versioned URLs immutable |

Preserve existing work: CSRF, hashed tokens, timing-safe compares (`src/lib/auth/crypto.ts`, `tokens.ts`), pairing TTL, WAF method locks, `X-Content-Type-Options: nosniff`, image CSP sandbox.

---

## 20. Safe additive migration strategy

Strangler pattern:

1. Ship empty tables (no routes) — rollback = unused tables
2. Ship ingest + DropIMG-hosted delivery behind `MEDIA_ENABLED` env flag (default false in production until soak on staging)
3. MCP tools behind same flag
4. Dashboard behind flag
5. Billing SKUs
6. Transforms queue
7. Custom domains
8. Teams/invites (Agency)

`images` cron, R2 `o/` lifecycle, `/api/upload`, extension, ShareX, `/api/v1/images` stay on the old path forever unless a later project explicitly migrates a drop to an asset.

Rollback boundary per phase: disable flag; do not reverse-migrate data. D1 has no down migrations in this repo (`migrations/*.sql` are forward-only).

---

## 21. Phased implementation roadmap

### Phase 0 — Owner decisions (no code)

Resolve section 25. Freeze catalog numbers as config defaults.

### Phase 1 — Foundation (smallest safe build) — **recommended first implementation**

**In:** personal org auto-create; one project; folders optional (root only OK); permanent original assets; stable alias on `media.dropimg.io` (or `dropimg.io/m/:project/:alias`); project-scoped key; tenancy tests; `MEDIA_ENABLED` flag; usage events for storage/uploads; audit on create/replace.

**Out:** custom domains, variants/AVIF, teams/invites, new PayPal SKUs (use flag + manual allowlist or reuse Pro as a temporary gate — see decisions), Cursor rewrite skill, webhooks, export zip, website IA overhaul (one sentence on homepage is enough).

**Depends on:** D1 migrations 1–5 in section 9.11; R2 prefix `p/` **with no lifecycle delete rule**.

**Rollback:** `MEDIA_ENABLED=false`.

### Phase 2 — Agent workflow

Upload URLs, MCP media tools, Cursor skill (audit + rewrite manifest), confirm flags.

### Phase 3 — Transforms

Queue, presets, variants, cache policy, cost meters.

### Phase 4 — Billing + lifecycle

New PayPal plans, org subscriptions, grace/read-only/suspend, emails.

### Phase 5 — Custom domains + Agency

SSL for SaaS, members, invites, multiple projects UI, webhooks, export.

### Phase 6 — Website + docs

Full IA, pricing page, OpenAPI media spec, status/runbooks.

Phases 2–6 must not start until Phase 1 acceptance is green and the owner re-approves.

---

## 22. Acceptance criteria per phase

### Phase 1

- Temporary upload/share/delete/extension/ShareX/API/MCP drop tools still pass existing tests
- Creating a project does not alter `images` rows
- `GET https://<media-host>/<project>/<alias>` serves the current original
- Replacing an asset uploads a new R2 key; alias URL unchanged; old key still exists
- User B cannot read user A’s asset by UUID (404)
- Cron does not delete `p/` objects
- Flag off → media routes 404

### Phase 2

- Agent can upload via MCP without breaking drop tools
- Replace requires `confirm`
- Rewrite skill produces a manifest without writing files until confirmed

### Phase 3

- Preset list is finite; unknown preset 400
- Failed variant does not flip alias
- Retry succeeds without duplicate R2 objects for same `(version, preset)`

### Phase 4

- `past_due` org stays delivering during grace
- After grace, uploads 402/403, GETs still 200
- After suspend, GET is neutral error, not marketing HTML
- Voluntary cancel matches paid-through date

### Phase 5

- Unverified hostname never serves project A’s bytes
- Removed hostname can be claimed by another org only after cooling period (owner: 7 days recommended)
- Export zip contains originals + manifest

### Phase 6

- Homepage uploader still works in e2e
- New pages pass `seo:check` / consent checks already in repo scripts

---

## 23. Automated tests required in every phase

**Always run:** existing `npm test` + `npm run test:e2e` (CI already does). Visual remains manual/`npm run visual`.

**Phase 1 additions:**

- Unit: alias path parser, preset denial (if any), authz matrix
- Integration: ingest → serve → replace → old version fetch; **tenancy isolation**; flag off; quota reject
- E2E: optional later; not blocking if API integration is strong

**Phase 2:** MCP media tools + existing `tests/integration/mcp.test.ts` still green

**Phase 3:** queue consumer idempotency (fake queue in wrangler test harness)

**Phase 4:** webhook → lifecycle transitions (extend `tests/integration/billing-webhook.test.ts` pattern)

**Phase 5:** hostname uniqueness + verification failure does not attach

**CI:** add `npm audit --audit-level=high` as non-blocking first, then blocking once noise is tamed.

---

## 24. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mixing permanent rows into `images` | Med if rushed | High (cron/R2 wipe) | Separate tables + prefix; tests that cron ignores `p/` |
| PayPal category / new SKUs | Med | High | Keep temporary Pro; legal/category review before “host a website’s images forever” |
| D1 size/perf with variants + audit | Med | Med | Rollups, bounded history, don’t store payloads in D1 |
| Worker CPU on transforms | High if sync | High | Queue only |
| Custom hostname takeover | Med | High | TXT + unique + cooling |
| Agent bulk rewrite destroying sites | Med | High | Manifest, confirm, git |
| Scope explosion | High | High | Phase 1 freeze |
| `past_due` already grants Pro | Low | Med | Don’t copy blindly to media lifecycle; define grace explicitly |
| Moderation on a public CDN | High if ignored | High | State machine for aliases |
| Two products confusing pricing | High | Med | Homepage: free drops vs paid media |
| Uncommitted local media URL work vs git | — | — | Direct `/:slug.ext` is productized; keep it on the drop plane |

---

## 25. Open owner decisions (recommended defaults)

1. **Media hostname:** dedicated `media.dropimg.io` vs path on apex `dropimg.io/m/…`  
   **Default:** `media.dropimg.io` custom domain on the same Worker (cleaner cache/WAF). Path-on-apex is a fallback if DNS lag matters.

2. **Does current $2.99 Pro include any permanent storage?**  
   **Default:** No. Pro stays temporary-drop Pro. Permanent starts at a new SKU (or a flagged trial on Free).

3. **Free permanent trial size?**  
   **Default:** 0 in phase 1 (paid-only ingest) to avoid support/cost surprise; optional 50 MB later.

4. **Public indexability of production assets?**  
   **Default:** `noindex, noimageindex` like drops (`imageResponseHeaders`). Customer can opt in later.

5. **File types:** images only vs CSS/fonts/video?  
   **Default:** same four image types as `ALLOWED_MIMES` in `src/types.ts`. No video in v1.

6. **Cloudflare Image Resizing vs self-encode?**  
   **Default:** evaluate in phase 3 with a cost spike test; originals-only until then.

7. **Seats on Developer tier?**  
   **Default:** 1 owner only until Agency phase.

8. **Grace / suspend / delete windows?**  
   **Default:** 7 days grace (full), 7 days read-only, 14 days retained+export, then scheduled delete.

9. **Promote a temporary drop into the library?**  
   **Default:** out of scope (copy-upload instead). Avoid linking `images.id` into assets.

10. **Physical Worker split?**  
    **Default:** no.

11. **Queue in phase 1?**  
    **Default:** no. Originals only.

12. **Homepage copy change in phase 1?**  
    **Default:** one supporting sentence only; full IA in phase 6.

---

## Exclusions (global)

- No implementation in this change set
- No production schema applied
- No Durable Objects, extra Workers, or external SQL
- No unlimited image processor
- No replacing PayPal
- No Chrome Web Store submission as part of media work
- No mixing `o/` lifecycle rules onto `p/`

---

## First implementation phase (repeat)

**Phase 1 — Foundation**, after this plan is approved and section 25 defaults are confirmed or amended.

Deliver personal org + project + immutable originals + stable DropIMG-hosted alias + project API key + tenant isolation tests + `MEDIA_ENABLED` flag. Leave drops, extension, ShareX, MCP drop tools, PayPal Pro, and `images` cron exactly as they are.

**Stop here until explicit owner approval to implement.**
