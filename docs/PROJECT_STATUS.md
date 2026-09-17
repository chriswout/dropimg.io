# DropIMG Project Status

Canonical snapshot as of **paid Web Assets production launch** on `main`. Prefer this file over git history and over [`docs/plans/media-backend-for-ai-websites.md`](plans/media-backend-for-ai-websites.md).

---

## Product Definition

### DropIMG Drops

Temporary image sharing. Paste, drop, or upload a PNG/JPEG/WebP/GIF; get a public link that expires. Anonymous use is first-class. Accounts add My Drops, Pro lifetimes, password protection, extension pairing, ShareX, REST `/api/v1/images`, and MCP drop tools.

Unprotected drops copy a **direct image URL** with the real extension (`https://dropimg.io/{slug}.png`). Password-protected drops still use the extensionless share page so recipients see the unlock form. Legacy `GET /i/:slug` still serves bytes.

Drops do **not** accept SVG, AVIF, ICO, or fonts.

### DropIMG Media (Web Assets)

Permanent **Web Asset infrastructure** for AI-built websites and applications. Broader than an image host, narrower than a blob store:

`Organization → Project → Asset → Immutable Version → Stable Alias`

Public alias:

`https://dropimg.io/m/{orgSlug}/{projectSlug}/{path}`

**Public media aliases provide no confidentiality. Knowledge of the URL is sufficient for access. Alias entropy is not an authorization mechanism.**

Replacing the file creates a new R2 object and version row. The alias URL does not change. Originals live at `p/{org}/{project}/{asset}/{version}/original`.

Supported Web Assets: JPEG, PNG, WebP, GIF, AVIF, sanitized SVG, ICO, WOFF, WOFF2.

Explicitly unsupported: PDFs, video, audio, archives, EXE/APK, HTML/JS/CSS/PHP, source, generic blobs. DropIMG is not S3/R2/Vercel Blob.

---

## Architecture Snapshot

One Cloudflare Worker ([`src/index.ts`](../src/index.ts)): Hono app + OAuth provider wrapping `/mcp`. D1 is the source of truth. R2 stores bytes. KV holds OAuth client state. Cron every 5 minutes expires **temporary** `images` only.

| Plane | Identity | Storage | Delivery | Cleanup |
|---|---|---|---|---|
| Drops | Optional `users.id`; integration tokens `dropimg_it_*` / `dropimg_api_*` | `images` + R2 `o/{24h\|7d\|30d\|pro}/…` | `/:slug.ext`, `/i/:slug`, share `/:slug` | D1 `expires_at` + cron + R2 lifecycle on `o/` prefixes |
| Media | Personal org + project; keys `dropimg_pk_*`; MCP intents `dropimg_ui_*` | `assets` / `asset_versions` / `asset_aliases` + R2 `p/…/original` | `GET /m/…` | Soft-delete + immediate R2 delete of that asset’s originals. No cron, no R2 lifecycle on `p/` |

Auth for humans is passwordless (magic link, Google, GitHub). Billing is PayPal REST Subscriptions. Two products, never mixed:

- **Drops Pro** — €2.99/month or €24.99/year (`product = drops_pro`)
- **Web Assets** — Free / Developer / Pro in USD (`product = web_assets`)

Moderation is Workers AI after metadata strip for PNG/JPEG/WebP/GIF only.

Canonical Web Assets plan config: [`src/lib/web-assets-plans.ts`](../src/lib/web-assets-plans.ts). Entitlements come from verified PayPal rows (`product = 'web_assets'`), never from a client-supplied plan id.

---

## Current Production State

Paid Web Assets are **live** on `https://dropimg.io`.

| Item | Value |
|---|---|
| Feature commit | `45cb22f987777fa91101b67843215d871037aa5e` |
| Worker version | `9f9f0c07-9f1a-438c-a246-1d27f33cff87` (2026-09-17T12:50:08Z) |
| Production D1 | `0adba959-a9d1-42ee-af0c-e62f96e3e0c1` (`dropimg`) |
| Applied migrations | `0001`–`0016` (including `0013`, `0014`, `0015`, `0016_web_assets_billing`) |
| Pre-migration snapshot | `.backup/prod-20260917-1249.sql` (gitignored), taken while D1 was still at `0012` |
| `GET /api/site-config` | `mediaEnabled=true`, `mediaDeliveryEnabled=true`, `webAssetsCheckout=true` |
| Deploy path | Local authenticated Wrangler (GitHub Actions Cloudflare token still fails KON-41) |

---

## Current Staging State

Staging remains Media-on with PayPal sandbox Web Assets SKUs. Format expansion qualification on `https://dropimg-staging.christenwout.workers.dev` still stands (AVIF/ICO/SVG/WOFF2, sanitizer 422, replace MIME, `@font-face`).

---

## Feature Flags

| Flag | Development | Staging | Production | Gates |
|---|---|---|---|---|
| `MEDIA_ENABLED` | `false` | `true` | `true` | Legacy alias for control plane |
| `MEDIA_CONTROL_PLANE_ENABLED` | `false` | `true` | `true` | `/api/v1/media/*`, `/app/media`, Media MCP tools, project keys, uploads |
| `MEDIA_DELIVERY_ENABLED` | `false` | `true` | `true` | Public `GET /m/*` |
| `BILLING_ENABLED` | `false` | `true` | `true` | PayPal checkout, sync, portal |
| `LONG_TTL_ENABLED` | `false` | `true` | `true` | Expiry allowlist beyond legacy 24h |
| `PRO_50MB_ENABLED` | `false` | `true` | `false` | Drop Pro 50MB upload cap |
| `MODERATION_ENABLED` | `false` | `false` | `true` | Post-strip Workers AI classify |
| `MODERATION_ENFORCE` | `false` | `false` | `false` | Hard-block vs shadow |
| `UGC_SHARE_ADS_ENABLED` | `false` | `false` | `false` | Ads on share pages |

### Rollback

Do **not** set `MEDIA_DELIVERY_ENABLED=false` to stop new uploads. That would 404 live `/m/…` aliases.

Emergency rollback:

1. `MEDIA_CONTROL_PLANE_ENABLED=false` — stops projects, uploads, replacements, keys, MCP Media writes, `/app/media`
2. Keep `MEDIA_DELIVERY_ENABLED=true` — existing public aliases keep serving

Covered by [`tests/integration/media-delivery-rollback.test.ts`](../tests/integration/media-delivery-rollback.test.ts).

---

## Web Assets plans (enforced)

Source of truth: `WEB_ASSETS_PLANS`. Max file size is 10 MB on every plan.

| Plan | Price | Projects | Storage | Deliveries / month UTC | Active keys |
|---|---|---|---|---|---|
| `free` | $0 | 3 | 1 GB | 100,000 | 2 |
| `developer` | $9/month or $90/year | 20 | 10 GB | 2,000,000 | 20 |
| `pro` | $29/month or $290/year | 100 | 100 GB | 10,000,000 | 100 |

Downgrade / over-limit: do not delete assets or break `/m/…` URLs. Block new projects, new keys, and new bytes that would increase storage. Replacement is allowed only when `current_usage + incoming_size <= plan.storage_limit` (immutable versions still count).

Delivery overage: live aliases never return 402/404. Crossing 100% of the monthly GET-200 count starts a **3-day grace** window and dashboard warning (80% warn). Counter resets on **calendar month UTC** for Free and paid.

Meter: successful `GET /m/…` that returns **200** only. HEAD, 304, REST, MCP, dashboard HTML are not counted. Writes are `waitUntil` D1 UPSERT on `media_delivery_months` plus Analytics Engine — not a D1 write on the response path.

---

## Billing

Provider: PayPal REST Subscriptions. Catalog and webhook details: [`docs/paypal.md`](paypal.md).

Checkout:

- Free → `/web-assets` / sign-in / `/app/media` (no card)
- Developer / Pro → `POST /api/billing/web-assets/checkout` → PayPal approve URL
- Monthly and annual supported
- Entitlement flips only after verified webhook (`product = web_assets`, plan id mapped in env)

Drop Pro checkout (`POST /api/billing/checkout`) is unchanged.

---

## Completed

Drops (production product): unchanged. SVG/AVIF/ICO/fonts remain Drop-rejected.

Media Phase 2, Web Asset formats (KON-53–57), agent skill (KON-59), website repositioning (KON-79–81).

Paid Web Assets launch:

- Canonical plans + server entitlements
- Distinct PayPal Web Assets SKUs (sandbox + live)
- Project / storage / key / delivery quotas on app, REST, and MCP
- Usage UI in `/app/media`; Drops vs Web Assets billing on `/app/billing`
- Live pricing CTAs (`Start free` / `Choose Developer` / `Choose Pro`)
- Production D1 `0013`–`0016`, Media flags on, Worker `9f9f0c07-9f1a-438c-a246-1d27f33cff87`

---

## Milestone

**7. Paid Web Assets production launch**

Local/CI gates at feature commit: **59 files, 434 tests, 0 failed**. Production Media is on. KON-60 marketplace is **not** started. KON-41 remains open.

---

## Known Risks

### Release engineering / deployment reliability

| Rank | Issue |
|---|---|
| HIGH | GitHub Actions `CLOUDFLARE_API_TOKEN` is still a Wrangler OAuth token, not a dashboard-created API token. Wrangler OAuth cannot mint user API tokens (9109). Production launch used local Wrangler OAuth. CI still fails fast via `wrangler whoami` before migrate/deploy. KON-41. |
| MEDIUM | Live PayPal Developer/Pro subscriptions were not completed end-to-end (no real $9/$90/$29/$290 charges). Checkout URL minting works; webhook/entitlement coverage is CI. |

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
| INFORMATIONAL | Linear MCP is not connected in this environment; launch issues were not updated from here. |

Isolation (`images` / cron / `o/` vs media tables / `p/`) remains intact.

---

## Public website

| Route | Role |
|---|---|
| `/` | Hybrid homepage: Web Assets hero + demo + existing Drop uploader |
| `/web-assets` | Product page (English) |
| `/pricing` | Live Web Assets plans + PayPal checkout for Developer/Pro |
| `/developers` | Agent onboarding (Cursor / Claude Code / Codex / MCP) plus Drop API |
| `/drops` | Dedicated temporary Drop page; homepage widget remains |
| `/app/media` | Authenticated Media app + usage |
| `/app/billing` | Drops Pro and Web Assets shown separately |

---

## Observability

Cloudflare Analytics Engine (`dropimg_events`). New Web Assets events:

`web_assets_checkout_started`, `web_assets_checkout_completed`, `web_assets_subscription_activated`, `web_assets_subscription_cancelled`, `web_assets_plan_upgraded`, `web_assets_plan_downgraded`, `web_assets_quota_warning`, `web_assets_quota_blocked`

Existing: `media_project_created`, `media_first_asset_created`, `media_stable_url_returned`, `media_asset_replaced`, `media_asset_delivered`, plus Drop funnel events. No secrets/paths/tokens.

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

Production is `workflow_dispatch` only. Until KON-41 is fixed, production deploys are local Wrangler.

R2 lifecycle JSON has **no** `p/` delete rule. Do not add one.

---

## Next Milestone

**8. Cursor Marketplace plugin / KON-84** (first distribution target under KON-60). Canonical skill: [`.agents/skills/dropimg-web-assets/SKILL.md`](../.agents/skills/dropimg-web-assets/SKILL.md). Plugin manifest: [`.cursor-plugin/plugin.json`](../.cursor-plugin/plugin.json). Do not add a second MCP endpoint. Do not mark KON-60 / KON-83 / KON-85 / KON-86 complete from this pass.

Also remaining: mint a durable Cloudflare API token for Actions (KON-41). Live paid-plan charges still need a controlled confirmation when you want them. Marketplace submission is manual at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) after local plugin validation.

### Explicitly Deferred

Custom domains, dedicated asset hostname, teams/seats, SSO, transforms, AVIF decode/strip, TTF/OTF, resize presets, Queues, CDN analytics, stock photos, video, PDF, generic blob storage, image generation, marketplace submissions.

---

## Isolation (verified)

- Temporary keys: `r2Key()` → `o/{class}/YYYYMMDD/{id}`
- Permanent keys: `permanentOriginalKey()` → `p/…/original`
- Cron: `SELECT … FROM images WHERE expires_at` only
- Media ingest: `INSERT` into `assets` / `asset_versions` / `asset_aliases` only
- Media delete: media tables + `p/` objects only
- Tests: creating a project does not change `images` count; cron leaves a `p/` object in R2; Drop SVG upload still fails
