# dropimg.io

Paste or drop an image → get a temporary shareable URL.

**Stack:** Cloudflare Workers + R2 + D1 + Hono + Vite (vanilla TS)

**Live:** https://dropimg.io  
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

GitHub Actions (`.github/workflows/deploy.yml`) deploys staging on push to `main`. Set repo secrets:

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
- [Stripe](docs/stripe.md)
- [Integrations](docs/integrations.md)
- [Browser extension](docs/extension.md)
- [ShareX](docs/sharex.md)
- [Moderation](docs/moderation.md)
- [R2 lifecycle](docs/r2-lifecycle.md)

## Current product

**Free / anonymous**

- Paste, drop, or choose an image — no account required
- Choose 1 hour, 24 hours, or 7 days (default 7 days), 10 MB, PNG / JPEG / WebP / GIF (no SVG)
- Share pages are `noindex`

**DropIMG Pro** (€2.99/mo or €24.99/yr — save 30%, $2.08/mo billed annually)

- Links up to 90 days, 50 MB when enabled, password protection, My drops history, extension + ShareX account uploads, ad-free
- Still temporary — no permanent storage

Optional passwordless accounts (`/login`, `/app`, `/account`) exist in the codebase. **Production V2 flags stay off** (`BILLING_ENABLED`, `LONG_TTL_ENABLED`, `PRO_50MB_ENABLED`). Staging has them on.

ShareX authenticated uploads stay on a 10 MB multipart cap. Extension image passwords are deferred.
