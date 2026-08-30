-- Billing moved from Paddle to Stripe. Every write names its provider
-- explicitly, but the old column default would quietly file any future insert
-- under a provider nothing reads, making the subscription invisible to
-- entitlements. SQLite cannot alter a default in place, so the table is
-- rebuilt. Rows are carried across untouched.

CREATE TABLE subscriptions_new (
  id                         TEXT PRIMARY KEY,
  user_id                    TEXT NOT NULL REFERENCES users(id),
  provider                   TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id       TEXT,
  provider_subscription_id   TEXT UNIQUE,
  status                     TEXT NOT NULL,
  price_id                   TEXT,
  current_period_end         INTEGER,
  cancel_at_period_end       INTEGER NOT NULL DEFAULT 0,
  created_at                 INTEGER NOT NULL,
  updated_at                 INTEGER NOT NULL,
  provider_occurred_at       INTEGER
);

INSERT INTO subscriptions_new (
  id, user_id, provider, provider_customer_id, provider_subscription_id,
  status, price_id, current_period_end, cancel_at_period_end,
  created_at, updated_at, provider_occurred_at
)
SELECT
  id, user_id, provider, provider_customer_id, provider_subscription_id,
  status, price_id, current_period_end, cancel_at_period_end,
  created_at, updated_at, provider_occurred_at
FROM subscriptions;

DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;
CREATE INDEX idx_subs_user ON subscriptions(user_id);
