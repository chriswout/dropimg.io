-- Google / GitHub identities. users.id stays the billing and MCP key.
-- One identity per provider account, and one provider per DropIMG user.
CREATE TABLE auth_identities (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  provider          TEXT NOT NULL,
  provider_user_id  TEXT NOT NULL,
  email_norm        TEXT,
  created_at        INTEGER NOT NULL,
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);
CREATE INDEX idx_auth_identities_user ON auth_identities(user_id);
