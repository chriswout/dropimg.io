-- Web Assets billing is a separate PayPal product from Drop Pro.
-- Existing subscription rows are Drop Pro.

ALTER TABLE subscriptions ADD COLUMN product TEXT NOT NULL DEFAULT 'drops_pro';
CREATE INDEX idx_subs_user_product ON subscriptions(user_id, product);

-- Monthly delivery counters. Incremented off the request path via waitUntil.
-- Serving never waits on this row. Calendar month UTC (`YYYY-MM`).
CREATE TABLE media_delivery_months (
  org_id      TEXT NOT NULL,
  period      TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  warned_at   INTEGER,
  over_at     INTEGER,
  grace_until INTEGER,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (org_id, period)
);
