-- Payment history, dunning idempotency, and deferred plan revisions.
-- Catalogs stay separate: every payment row carries product.

ALTER TABLE subscriptions ADD COLUMN pending_price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN pending_effective_at INTEGER;

CREATE TABLE billing_payments (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id),
  subscription_id          TEXT,
  product                  TEXT NOT NULL,
  plan_id                  TEXT,
  provider                 TEXT NOT NULL DEFAULT 'paypal',
  provider_transaction_id  TEXT,
  amount                   TEXT,
  currency                 TEXT,
  status                   TEXT NOT NULL,
  paid_at                  INTEGER,
  period_start             INTEGER,
  period_end               INTEGER,
  receipt_url              TEXT,
  created_at               INTEGER NOT NULL,
  UNIQUE (provider, provider_transaction_id)
);
CREATE INDEX idx_billing_payments_user ON billing_payments(user_id, paid_at DESC);

CREATE TABLE billing_notifications (
  provider            TEXT NOT NULL,
  event_id            TEXT NOT NULL,
  notification_type   TEXT NOT NULL,
  user_id             TEXT,
  subscription_id     TEXT,
  sent_at             INTEGER NOT NULL,
  PRIMARY KEY (provider, event_id, notification_type)
);
