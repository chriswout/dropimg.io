CREATE TABLE images (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  r2_key            TEXT NOT NULL,
  mime              TEXT NOT NULL,
  size              INTEGER NOT NULL,
  width             INTEGER,
  height            INTEGER,
  delete_token_hash BLOB NOT NULL,
  ip_hash           TEXT,
  created_at        INTEGER NOT NULL,
  expires_at        INTEGER NOT NULL,
  deleted_at        INTEGER,
  delete_reason     TEXT
);

CREATE INDEX idx_sweep ON images(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_quota ON images(ip_hash, created_at);
CREATE INDEX idx_purge ON images(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  reason     TEXT NOT NULL,
  detail     TEXT,
  created_at INTEGER NOT NULL,
  handled_at INTEGER
);
