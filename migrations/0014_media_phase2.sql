-- Phase 2: upload intents, idempotency scope/TTL, credential display prefix.
-- Temporary `upload_intents` / `images` / cron are unchanged.

ALTER TABLE media_idempotency ADD COLUMN expires_at INTEGER;
ALTER TABLE media_idempotency ADD COLUMN operation TEXT;
ALTER TABLE media_idempotency ADD COLUMN project_id TEXT;

ALTER TABLE project_credentials ADD COLUMN token_prefix TEXT;

CREATE TABLE media_upload_intents (
  id                    TEXT PRIMARY KEY,
  token_hash            BLOB NOT NULL UNIQUE,
  org_id                TEXT NOT NULL REFERENCES organizations(id),
  project_id            TEXT NOT NULL REFERENCES projects(id),
  operation             TEXT NOT NULL,
  path                  TEXT,
  asset_id              TEXT,
  name                  TEXT,
  actor_user_id         TEXT,
  actor_credential_id   TEXT,
  created_at            INTEGER NOT NULL,
  expires_at            INTEGER NOT NULL,
  consumed_at           INTEGER
);
CREATE INDEX idx_media_intents_project
  ON media_upload_intents(project_id, created_at);
CREATE INDEX idx_media_intents_expiry
  ON media_upload_intents(expires_at);
