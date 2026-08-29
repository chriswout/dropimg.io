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

- [Browser extension](docs/extension.md)
- [ShareX](docs/sharex.md)
- [Moderation admin](docs/moderation.md)

## V1 scope

- Upload via Worker (raw body), private R2, short 8-char Base58 URLs
- 24h expiry, delete token, no accounts
- Formats: PNG / JPEG / WebP / GIF (no SVG)
- Rate limit: 10 uploads / 60s + 100 uploads / 500 MB per day (hashed IP)
- Admin reports at `/admin` (cookie session from `ADMIN_TOKEN`)
- Optional accounts: passwordless `/login`, My drops at `/app` (staging; see [docs/auth.md](docs/auth.md), [docs/account.md](docs/account.md))
