/*
# Add scroll_animation_enabled to site_settings

1. New Columns
- `site_settings.scroll_animation_enabled` (boolean, default true) — toggles scroll-triggered reveal animations on the public site and guest portal.

2. Security
- No RLS or policy changes. Existing policies on site_settings remain unchanged.

3. Notes
- Defaults to true so animations are on by default.
- Safe to re-run (uses DO block with IF NOT EXISTS check).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'scroll_animation_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN scroll_animation_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;