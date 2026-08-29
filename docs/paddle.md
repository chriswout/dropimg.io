# Paddle (staging sandbox)

Sandbox catalog:

- Product `pro_01m17sgn37490r5dzeh54f9j64` — DropIMG Pro (`saas`)
- Monthly `pri_01m17sgnc1k3ck9mgxh176fh8h` — $1.99 / month
- Annual `pri_01m17sgnj1gjtraqzk7w6z3pm5` — $19.99 / year

Checkout overlay on `/pro`. Pro is granted only from a verified webhook (`POST /api/billing/paddle/webhook`). Signature is HMAC-SHA256 of `ts:rawBody` with a 10s timestamp window.

Checkout will 400 (`transaction_default_checkout_url_not_set`) until a **default payment link** is set in the Paddle dashboard. Sandbox: [Checkout settings](https://sandbox-vendors.paddle.com/checkout-settings). Use `https://dropimg-staging.christenwout.workers.dev/pro` (or `https://localhost/`). This cannot be set via the API. Approved checkout domains currently include `dropimg.io` and `dropimg-staging.christenwout.workers.dev`.

Production keeps `BILLING_ENABLED=false` until Phase G.
