# DropIMG Pro

One personal plan. Production V2 (billing, long TTL, 50 MB) stays **gated off**
until the [launch runbook](launch.md) turns each gate on in order.

## Offer

- **$2.99 / month** or **$24.99 / year** (about $2.08/mo, save 30%)
- Annual is the default on `/pro` and carries the **Best value** badge. Never
  "Most popular" — there is only one paid plan to be popular against.
- Localized public URLs: `/pro`, `/es/pro`, `/pt-br/pro`, `/de/pro`
- Indexable product page (canonical, hreflang, Open Graph, JSON-LD)

## What Pro includes

- Choose **1 hour, 24 hours, 7 days, 30 days, or 90 days** (Free and anonymous
  choose **1 hour, 24 hours, or 7 days**; every plan defaults to 7 days)
- Uploads up to **50 MB** when `PRO_50MB_ENABLED` is on
- Full active upload history on [My drops](account.md)
- Password-protected links
- Account uploads from the [browser extension](extension.md) and [ShareX](sharex.md)
- Always ad-free

DropIMG stays temporary. An image can never outlive its original `created_at`
by more than 90 days, no matter how many times its owner extends it. There is no
permanent storage, storage quota, or team plan.

## Who can buy

Checkout is a signed-in Paddle overlay. Anonymous visitors are sent to `/login`. Active Pro subscribers see **You're on DropIMG Pro** and **Manage billing** — no purchase CTAs.

Pro is granted only from a verified Paddle webhook. The browser never grants Pro from checkout UI state.

## Flags

| Environment | `BILLING_ENABLED` | `LONG_TTL_ENABLED` | `PRO_50MB_ENABLED` |
|-------------|-------------------|--------------------|--------------------|
| Staging     | true              | true               | true               |
| Production  | false             | false              | false              |

`LONG_TTL_ENABLED` is one switch for the whole choose-your-own-lifetime feature,
Free and Pro together, because both depend on the same `o/7d` and `o/pro` bucket
lifecycle rules existing. With it off, every plan gets the single legacy 24-hour
lifetime and the uploader hides the selector rather than showing a one-option
radiogroup.

See [paddle.md](paddle.md) for catalog IDs, webhooks, and sandbox checkout.
