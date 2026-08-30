# DropIMG Pro

One personal plan. Production V2 (billing, long TTL, 50 MB) stays **gated off** until Phase G.

## Offer

- **$1.99 / month** or **$19.99 / year** (about $1.67/mo, save 16%)
- Annual is the default on `/pro`
- Localized public URLs: `/pro`, `/es/pro`, `/pt-br/pro`, `/de/pro`
- Indexable product page (canonical, hreflang, Open Graph, JSON-LD)

## What Pro includes

- Keep links **7 or 30 days** (Free/anonymous stay **24 hours**)
- Uploads up to **50 MB** when `PRO_50MB_ENABLED` is on
- Full active upload history on [My drops](account.md)
- Password-protected links
- Account uploads from the [browser extension](extension.md) and [ShareX](sharex.md)
- Always ad-free

DropIMG stays temporary. Even Pro links expire after a maximum of 30 days. There is no permanent storage, unlimited quota, or team plan.

## Who can buy

Checkout is a signed-in Paddle overlay. Anonymous visitors are sent to `/login`. Active Pro subscribers see **You're on DropIMG Pro** and **Manage billing** — no purchase CTAs.

Pro is granted only from a verified Paddle webhook. The browser never grants Pro from checkout UI state.

## Flags

| Environment | `BILLING_ENABLED` | `LONG_TTL_ENABLED` | `PRO_50MB_ENABLED` |
|-------------|-------------------|--------------------|--------------------|
| Staging     | true              | true               | true               |
| Production  | false             | false              | false              |

See [paddle.md](paddle.md) for catalog IDs, webhooks, and sandbox checkout.
