ALTER TABLE integration_tokens ADD COLUMN scopes TEXT;
ALTER TABLE integration_tokens ADD COLUMN kind TEXT NOT NULL DEFAULT 'other';
