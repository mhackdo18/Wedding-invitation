/*
# Add hero image fit & position controls to site_settings

1. New Columns
- `hero_image_fit` (text, default 'cover') — controls how the welcome hero photo is sized: cover, contain, fill, or center
- `hero_image_position` (text, default 'center') — controls which part of the photo stays visible when cropped: center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right

2. Notes
- Both columns are nullable with sensible defaults so existing sites are unchanged.
- These settings apply only to the Welcome page hero photo, not per-section hero photos.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'hero_image_fit') THEN
    ALTER TABLE site_settings ADD COLUMN hero_image_fit text DEFAULT 'cover';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'hero_image_position') THEN
    ALTER TABLE site_settings ADD COLUMN hero_image_position text DEFAULT 'center';
  END IF;
END $$;
