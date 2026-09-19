# dropimg.io

Permanent **Web Assets** for AI-built apps, plus a fast temporary Drop when you need one.

**Live subscription billing is PayPal only.** See [docs/paypal.md](docs/paypal.md) and [AGENTS.md](AGENTS.md). Paddle and Stripe are not live processors.

**Live:** https://dropimg.io · **Web Assets:** https://dropimg.io/web-assets · **Pricing:** https://dropimg.io/pricing  
**Current state:** [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

## Cursor plugin

This public repo is the DropIMG Web Assets Cursor plugin (`dropimg`). MCP is `https://dropimg.io/mcp` (OAuth). Canonical skill: [`.agents/skills/dropimg-web-assets/SKILL.md`](.agents/skills/dropimg-web-assets/SKILL.md). Marketplace copy and local install: [docs/cursor-plugin.md](docs/cursor-plugin.md).

```text
User: Replace the homepage hero.
→ find homepage/hero → replace_media_asset → same /m/... URL
```

**Stack:** Cloudflare Workers + R2 + D1 + Hono + Vite (vanilla TS)  
**Staging:** https://dropimg-staging.christenwout.workers.dev

## Local development

```bash
cp .dev.vars.example .dev.vars
npm install
npx wrangler d1 migrations apply dropimg --local
npm run dev
```

Open the printed local URL. Paste a screenshot (`⌘V` / `Ctrl+V`) to upload.

## Deploy

Vite + Wrangler environments use `CLOUDFLARE_ENV` (not only `--env`):

```bash
npm run deploy:staging      # build + deploy dropimg-staging
npm run deploy:production   # build + deploy dropimg (needs dropimg.io DNS)
```

GitHub Actions (`.github/workflows/deploy.yml`) is *intended* to deploy staging on push to `main` after unit tests and Playwright. If e2e fails, remote migrate and deploy are skipped. See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md). Set repo secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` (`0d63cbb8e5f0ff360d850f1456eb7d50`)

Production deploy is manual via workflow_dispatch. Set production secrets with:

```bash
npx wrangler secret put IP_HASH_SECRET --env production
npx wrangler secret put ADMIN_TOKEN --env production
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + Workers runtime locally |
| `npm run build` | Production build (default env) |
| `npm run deploy:staging` | Build + deploy staging |
| `npm run deploy:production` | Build + deploy production |
| `npm test` | Unit + Worker integration tests |
| `npm run test:e2e` | Playwright homepage upload happy path |
| `npm run waf:apply` | Apply minimal WAF rules (needs Zone WAF Edit token) |
| `npm run types` | Generate `worker-configuration.d.ts` from Wrangler |

## Ops notes

**R2 lifecycle safety net** (already applied to staging + prod buckets):

```bash
npx wrangler r2 bucket lifecycle add dropimg-images-staging --name expire-o-prefix --prefix o/ --expire-days 2 -y
npx wrangler r2 bucket lifecycle add dropimg-images --name expire-o-prefix --prefix o/ --expire-days 2 -y
```

**Cron** runs every 5 minutes (`*/5 * * * *`) to tombstone expired rows and delete R2 objects.

## Docs

- [Auth](docs/auth.md)
- [Accounts](docs/account.md)
- [Pro](docs/pro.md)
- [PayPal](docs/paypal.md)
- [Integrations](docs/integrations.md)
- [Browser extension](docs/extension.md)
- [ShareX](docs/sharex.md)
- [Moderation](docs/moderation.md)
- [R2 lifecycle](docs/r2-lifecycle.md)
- [Media REST](docs/media-rest.md)
- [Cursor plugin](docs/cursor-plugin.md)
- [Web Assets skill](.agents/skills/dropimg-web-assets/SKILL.md)

## Current product

**Free / anonymous**

- Paste, drop, or choose an image — no account required
- Choose 1 hour, 24 hours, 7 days, or 30 days (default 7 days), 25 MB, PNG / JPEG / WebP / GIF (no SVG)
- Share pages are `noindex`

**Drops Pro** (€2.99/mo or €24.99/yr — save 30%, $2.08/mo billed annually)

- Links up to 180 days, password protection, My drops history, extension + ShareX account uploads, ad-free
- 50 MB uploads only when `PRO_50MB_ENABLED` is on (off in production)
- Drops stay temporary. Permanent files are Web Assets.

Optional passwordless accounts (`/login`, `/app`, `/account`) are live. Temporary Drops stay free; Drops Pro is €2.99/month. Permanent Web Assets are a separate Free / Developer / Pro product — see [pricing](https://dropimg.io/pricing).

ShareX authenticated uploads stay on a 25 MB multipart cap. Extension image passwords are deferred.
