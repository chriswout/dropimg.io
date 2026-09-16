-- Web asset taxonomy on immutable versions.
-- Existing raster rows stay image via DEFAULT. MIME remains authoritative for delivery.

ALTER TABLE asset_versions ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'image';
