-- Persist scrypt-v1 parameters so verification does not depend on hardcoded defaults.
-- password_iterations remains for legacy pbkdf2-sha256 staging rows (never treated as scrypt).
ALTER TABLE images ADD COLUMN password_cost INTEGER;
ALTER TABLE images ADD COLUMN password_block_size INTEGER;
ALTER TABLE images ADD COLUMN password_parallelization INTEGER;

ALTER TABLE upload_intents ADD COLUMN password_cost INTEGER;
ALTER TABLE upload_intents ADD COLUMN password_block_size INTEGER;
ALTER TABLE upload_intents ADD COLUMN password_parallelization INTEGER;
