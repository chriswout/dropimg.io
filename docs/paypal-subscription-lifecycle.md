# PayPal subscription lifecycle

Verified against PayPal REST Subscriptions v1 (docs last updated 2026-09-14).
Live DropIMG billing is **PayPal only**. See [paypal.md](paypal.md).

This file distinguishes what PayPal’s API actually does from what DropIMG
implements on top of it. Do not assume Stripe-style proration, invoices, or a
customer portal.

## PAYPAL SUPPORTS

### Read a subscription

`GET /v1/billing/subscriptions/{id}`

Useful fields:

| Field | Meaning |
|-------|---------|
| `status` | `APPROVAL_PENDING`, `APPROVED`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, `EXPIRED` |
| `plan_id` | Current billing plan (`P-…`) |
| `custom_id` | Merchant string. DropIMG stores the user id here. |
| `billing_info.last_payment` | Last successful charge (`amount`, `time`) |
| `billing_info.next_billing_time` | Next charge (ISO-8601). Often omitted once `CANCELLED`. |
| `billing_info.failed_payments_count` | Consecutive failures |
| `billing_info.last_failed_payment` | Last failed attempt |
| `billing_info.outstanding_balance` | Unpaid remainder, if any |
| `links` | HATEOAS, including `edit` / `self` / `cancel` |

`APPROVED` is a short-lived post-consent state before activation. DropIMG maps
it to `active`. There is no PayPal `past_due` status.

### List transactions

`GET /v1/billing/subscriptions/{id}/transactions?start_time=&end_time=`

Both timestamps are required. Returns subscription transaction records
(`COMPLETED`, `REFUNDED`, …), not PayPal Invoicing invoice objects. Use these
as payments / receipts, not invoices.

PayPal activity URLs (when a transaction id exists):

- live: `https://www.paypal.com/activity/payment/{txnId}`
- sandbox: `https://www.sandbox.paypal.com/activity/payment/{txnId}`

### Revise (change plan)

`POST /v1/billing/subscriptions/{id}/revise`

- Same subscription id (`I-…`). Do not create a second subscription.
- `plan_id` must belong to the **same PayPal product**.
- PayPal-funded instruments typically return a HATEOAS `approve` link; the
  buyer must consent. Card-on-file may skip that link.
- Documented effect: the **new plan price is billed at the next billing
  cycle**. The current cycle continues on the already-paid plan.
- PayPal does **not** document automatic proration, unused-time credit, or an
  immediate partial capture as part of revise.
- Quantity-only changes can skip buyer approval; plan_id changes generally
  do not.

### Cancel / suspend / activate

| Call | PayPal behavior |
|------|-----------------|
| `POST …/cancel` | Hard cancel. Status becomes `CANCELLED`. **Cannot** `activate` afterwards. |
| `POST …/suspend` | Soft pause. Can later `activate`. |
| `POST …/activate` | Resume a **suspended** subscription, not a cancelled one. |
| `POST …/capture` | Capture outstanding balance. Not used for plan changes. |

Refunds of a captured sale use the Payments refund APIs, not the
Subscriptions revise endpoint.

### Webhooks (payment failure and recovery)

Subscribe at least:

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.UPDATED` (includes accepted revise)
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.EXPIRED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
- `PAYMENT.SALE.COMPLETED`
- `PAYMENT.SALE.REFUNDED` (when available)
- `PAYMENT.SALE.DENIED` (observability)

Payment failure does not by itself expire the subscription. Repeated failures
typically end in `SUSPENDED`. `EXPIRED` is the term ending.

PayPal Invoicing (`INVOICING.*`) is a different product and is **not** part of
this subscription flow.

## DROPIMG IMPLEMENTS

Architecture:

```
DropIMG UI → DropIMG billing backend → PayPal Subscriptions API
         ↘ verified PayPal webhooks → DropIMG entitlement state
```

The return URL never grants access.

| Topic | DropIMG behavior |
|-------|------------------|
| Entitlement | `active` / `trialing` / `past_due`, or `canceled`/`paused` with a future `current_period_end`. `suspended` and `expired` do not grant access. |
| Duplicate checkout | Blocked. Existing `I-…` is revised; a second overlapping subscription is never minted. |
| Plan change | `POST /v1/billing/subscriptions/{id}/revise` for the same product. Effective **next renewal**. No DropIMG-invented proration or credit. |
| Pending change | `pending_price_id` + `pending_effective_at`. `price_id` stays the currently entitled plan until that timestamp. |
| Cancel renewal | DropIMG calls PayPal `cancel`, then keeps paid-through access until `current_period_end`. |
| Reactivate | **Not offered** for cancelled rows (PayPal cannot activate them). Suspended: send the buyer to PayPal to fix payment. |
| Payment method | PayPal wallet only (`Manage payment in PayPal`). No vault. |
| Payment history | Durable `billing_payments` rows from sale webhooks (hybrid: portal may backfill from the transactions API). Labeled **Payment history / Receipts**, not invoices. |
| Receipt email | Branded receipt on `PAYMENT.SALE.COMPLETED`, refund notice on `PAYMENT.SALE.REFUNDED`. Never labeled invoice — PayPal Subscriptions do not return invoice objects. |
| Dunning | Transactional email via the existing Cloudflare `EMAIL` binding. Deduped on `(provider, event_id, notification_type)`. Delivery is not guaranteed. |
| Catalogs | Drops Pro and Web Assets never share SKUs, plan ids, entitlements, history, or revise logic. |
