# Minimal WAF (dropimg.io)

Outer shield only. App-level limits stay in the Worker.

## Enabled

1. **Free Managed Ruleset** — Cloudflare’s Free-plan managed WAF coverage.
2. **Custom: block unsupported API methods** — only `POST /api/upload`, `DELETE /api/i/*`, `POST /api/report`.
3. **Custom: Managed Challenge suspicious uploads** — `POST /api/upload` when `cf.threat_score gt 14` (not a broad challenge).
4. **Rate limit: slug/image probing** — **Block** after **10 requests / 10s / IP** to `/i/*` or 8-char share paths (`/:slug`). Free plan: 10s period only, no Managed Challenge on rate-limit rules, no 404-only counting.

## Explicitly not enabled

- **Bot Fight Mode** — domain-wide, not customizable, can challenge anonymous `/api/upload`.
- Country/ASN blocks — add later only if abuse shows up in Security Events.
- Full Cloudflare Managed / OWASP rulesets — Pro+.

## Apply via API

Create a token: **Zone WAF → Edit**, **Zone → Read**, scoped to `dropimg.io`.

```bash
export CLOUDFLARE_API_TOKEN=...
node scripts/apply-waf.mjs
```

Config source of truth: `scripts/waf-config.mjs`.

## Apply via dashboard (manual)

1. [Security → Settings](https://dash.cloudflare.com/?to=/:account/dropimg.io/security/settings) → turn on **Cloudflare Free Managed Ruleset** (or “Free managed rules”).
2. [Security rules](https://dash.cloudflare.com/?to=/:account/dropimg.io/security/security-rules) → create the two custom rules and one rate-limit rule from `scripts/waf-config.mjs`.
3. Confirm **Bot Fight Mode** stays off.
