-- Persist upload surface on the row so API+MCP quotas and analytics
-- can query D1. Existing rows stay `web` and do not count as programmatic.
ALTER TABLE images ADD COLUMN source TEXT NOT NULL DEFAULT 'web';

CREATE INDEX idx_images_user_source_created
  ON images(user_id, source, created_at);
