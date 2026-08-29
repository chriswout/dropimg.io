CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  email_norm      TEXT NOT NULL UNIQUE,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER
);

CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  token_hash      BLOB NOT NULL UNIQUE,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  last_seen_at    INTEGER,
  revoked_at      INTEGER
);
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;

CREATE TABLE magic_links (
  id              TEXT PRIMARY KEY,
  email_norm      TEXT NOT NULL,
  token_hash      BLOB NOT NULL UNIQUE,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  used_at         INTEGER,
  ip_hash         TEXT
);
CREATE INDEX idx_magic_email_created ON magic_links(email_norm, created_at);
CREATE INDEX idx_magic_ip_created ON magic_links(ip_hash, created_at);

CREATE TABLE subscriptions (
  id                         TEXT PRIMARY KEY,
  user_id                    TEXT NOT NULL REFERENCES users(id),
  provider                   TEXT NOT NULL DEFAULT 'paddle',
  provider_customer_id       TEXT,
  provider_subscription_id   TEXT UNIQUE,
  status                     TEXT NOT NULL,
  price_id                   TEXT,
  current_period_end         INTEGER,
  cancel_at_period_end       INTEGER NOT NULL DEFAULT 0,
  created_at                 INTEGER NOT NULL,
  updated_at                 INTEGER NOT NULL
);
CREATE INDEX idx_subs_user ON subscriptions(user_id);

CREATE TABLE billing_events (
  provider           TEXT NOT NULL,
  event_id           TEXT NOT NULL,
  event_type         TEXT NOT NULL,
  received_at        INTEGER NOT NULL,
  processed_at       INTEGER,
  payload_hash       TEXT,
  status             TEXT NOT NULL DEFAULT 'received',
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE integration_tokens (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  token_hash      BLOB NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'upload',
  created_at      INTEGER NOT NULL,
  last_used_at    INTEGER,
  revoked_at      INTEGER
);
CREATE INDEX idx_integ_user ON integration_tokens(user_id) WHERE revoked_at IS NULL;

ALTER TABLE images ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE images ADD COLUMN password_hash BLOB;
ALTER TABLE images ADD COLUMN password_salt BLOB;
ALTER TABLE images ADD COLUMN password_kdf TEXT;
ALTER TABLE images ADD COLUMN password_iterations INTEGER;
CREATE INDEX idx_images_user_active
  ON images(user_id, created_at DESC)
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;
