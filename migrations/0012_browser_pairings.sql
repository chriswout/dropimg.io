-- Short-lived one-click pairing for the browser extension.
-- The device secret is hashed; the verification URL only carries `id`.
-- issued_token is the one-time dropimg_it_* value, wiped after consume.
CREATE TABLE browser_pairings (
  id                  TEXT PRIMARY KEY,
  device_secret_hash  BLOB NOT NULL UNIQUE,
  client              TEXT NOT NULL,
  created_at          INTEGER NOT NULL,
  expires_at          INTEGER NOT NULL,
  user_id             TEXT REFERENCES users(id),
  token_id            TEXT,
  issued_token        TEXT,
  approved_at         INTEGER,
  consumed_at         INTEGER,
  cancelled_at        INTEGER
);
CREATE INDEX idx_browser_pairings_expires ON browser_pairings(expires_at);
