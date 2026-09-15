-- Permanent media (parallel to temporary images). Cron must not sweep these.
-- R2 originals live under p/{org}/{project}/{asset}/{version}/original
-- with no bucket lifecycle expiry.

CREATE TABLE organizations (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  personal_user_id  TEXT UNIQUE REFERENCES users(id),
  lifecycle_status  TEXT NOT NULL DEFAULT 'active',
  lifecycle_changed_at INTEGER,
  grace_until       INTEGER,
  delete_after      INTEGER,
  created_at        INTEGER NOT NULL,
  deleted_at        INTEGER
);

CREATE TABLE organization_memberships (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  role        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  revoked_at  INTEGER
);
CREATE UNIQUE INDEX idx_memberships_live
  ON organization_memberships(org_id, user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_memberships_user
  ON organization_memberships(user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id),
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  archived_at INTEGER,
  deleted_at  INTEGER
);
CREATE UNIQUE INDEX idx_projects_org_slug
  ON projects(org_id, slug)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_org ON projects(org_id) WHERE deleted_at IS NULL;

CREATE TABLE assets (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  name        TEXT NOT NULL,
  created_by  TEXT REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);
CREATE INDEX idx_assets_project ON assets(project_id) WHERE deleted_at IS NULL;

CREATE TABLE asset_versions (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id),
  asset_id    TEXT NOT NULL REFERENCES assets(id),
  r2_key      TEXT NOT NULL,
  sha256      TEXT NOT NULL,
  mime        TEXT NOT NULL,
  byte_size   INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  status      TEXT NOT NULL,
  created_by  TEXT REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  failed_reason TEXT
);
CREATE INDEX idx_versions_asset ON asset_versions(asset_id, created_at);

CREATE TABLE asset_aliases (
  id                  TEXT PRIMARY KEY,
  org_id              TEXT NOT NULL REFERENCES organizations(id),
  project_id          TEXT NOT NULL REFERENCES projects(id),
  asset_id            TEXT NOT NULL REFERENCES assets(id),
  path                TEXT NOT NULL,
  current_version_id  TEXT NOT NULL REFERENCES asset_versions(id),
  created_at          INTEGER NOT NULL,
  deleted_at          INTEGER
);
CREATE UNIQUE INDEX idx_aliases_project_path
  ON asset_aliases(project_id, path)
  WHERE deleted_at IS NULL;

CREATE TABLE project_credentials (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  token_hash  BLOB NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  scopes      TEXT NOT NULL,
  created_by  TEXT REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at  INTEGER,
  expires_at  INTEGER
);
CREATE INDEX idx_project_creds_project
  ON project_credentials(project_id)
  WHERE revoked_at IS NULL;

CREATE TABLE usage_events (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL REFERENCES organizations(id),
  project_id       TEXT REFERENCES projects(id),
  meter            TEXT NOT NULL,
  delta            INTEGER NOT NULL,
  idempotency_key  TEXT NOT NULL UNIQUE,
  occurred_at      INTEGER NOT NULL,
  source           TEXT NOT NULL,
  ref_type         TEXT,
  ref_id           TEXT
);
CREATE INDEX idx_usage_org_time ON usage_events(org_id, occurred_at);

CREATE TABLE audit_events (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES organizations(id),
  actor_user_id         TEXT,
  actor_credential_id   TEXT,
  action                TEXT NOT NULL,
  target_type           TEXT,
  target_id             TEXT,
  request_id            TEXT,
  created_at            INTEGER NOT NULL
);
CREATE INDEX idx_audit_org_time ON audit_events(org_id, created_at);

CREATE TABLE media_idempotency (
  key            TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL,
  status         INTEGER NOT NULL,
  response_json  TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);
