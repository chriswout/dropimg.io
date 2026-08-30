# Paddle (staging sandbox)

Sandbox catalog:

- Product `pro_01m17sgn37490r5dzeh54f9j64` — DropIMG Pro (`saas`)
- Monthly `pri_01m19br9nek5t303zjv52vnpv1` — $2.99 / month
- Annual `pri_01m19br9ypsg7pdfqqgrgeehnw` — $24.99 / year

Paddle prices are immutable amounts, so a price change means new price IDs. The
original $1.99 / $19.99 prices (`pri_01m17sgnc1k3ck9mgxh176fh8h`,
`pri_01m17sgnj1gjtraqzk7w6z3pm5`) are archived: existing sandbox subscriptions
keep billing, but no new checkout can reach them. Whenever `PRO_COPY` changes a
displayed amount, the sandbox catalog has to move with it — the site must never
advertise one price and charge another.

Checkout overlay on `/pro`. Pro is granted only from a verified webhook (`POST /api/billing/paddle/webhook`). Signature is HMAC-SHA256 of `ts:rawBody` with a 10s timestamp window.

Customer-facing checkout states:

- Opening checkout…
- Payment received. Activating Pro… (after Paddle `checkout.completed`, while entitlements are still Free)
- Your payment was received. Pro is still activating. Refresh My drops in a moment. (poll timeout)
- Billing isn’t available right now. (flags off or config missing)

Do not say payment succeeded unless Paddle emitted `checkout.completed`. Do not grant Pro from frontend state.

Checkout will 400 (`transaction_default_checkout_url_not_set`) until a **default payment link** is set in the Paddle dashboard. Sandbox: [Checkout settings](https://sandbox-vendors.paddle.com/checkout-settings). Use `https://dropimg-staging.christenwout.workers.dev/pro` (or `https://localhost/`). This cannot be set via the API. Approved checkout domains currently include `dropimg.io` and `dropimg-staging.christenwout.workers.dev`.

Production keeps `BILLING_ENABLED=false` until Phase G. See [pro.md](pro.md).
