CREATE TABLE upload_intents (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  expiry_seconds  INTEGER NOT NULL,
  max_bytes       INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  used_at         INTEGER
);
CREATE INDEX idx_intents_user ON upload_intents(user_id, created_at);
