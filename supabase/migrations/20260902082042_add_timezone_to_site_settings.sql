ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
