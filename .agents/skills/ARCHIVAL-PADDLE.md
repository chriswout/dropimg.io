# Archival — Paddle skills are not used by DropIMG

**LIVE SUBSCRIPTION BILLING = PAYPAL.**

The `paddle-*` skills in this directory came from a generic Next.js + Paddle
cookbook. DropIMG does not charge through Paddle. Stripe is also not live.

Do not:

- add a Paddle checkout
- sync Paddle subscriptions
- build a Paddle customer portal
- follow these skills to “fix” DropIMG billing

Use [docs/paypal.md](../../docs/paypal.md) and `src/lib/billing/paypal.ts`.
Schema migrations that once defaulted `provider` to `paddle` or `stripe` stay
for history; live writes use `paypal`.
