ALTER TABLE upload_intents ADD COLUMN password_hash BLOB;
ALTER TABLE upload_intents ADD COLUMN password_salt BLOB;
ALTER TABLE upload_intents ADD COLUMN password_kdf TEXT;
ALTER TABLE upload_intents ADD COLUMN password_iterations INTEGER;
