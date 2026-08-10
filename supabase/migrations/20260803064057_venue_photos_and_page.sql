/*
# Venue photos + venue page template
1. venues: add photo_url for venue photo display
2. pages: add 'venue' to allowed templates (text column, no constraint to alter)
3. Seed a venue page if none exists
*/

-- ============ venues: add photo_url ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='venues' AND column_name='photo_url') THEN
    ALTER TABLE venues ADD COLUMN photo_url text;
  END IF;
END $$;

-- ============ Seed venue page ============
INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'venues', 'Venues', 'venue', true, 3, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE template = 'venue');

-- Shift display_order for pages after the new venue page
UPDATE pages SET display_order = display_order + 1
WHERE template NOT IN ('welcome', 'story', 'venue')
  AND template IN ('schedule', 'gallery', 'rsvp', 'find-table', 'custom')
  AND NOT EXISTS (SELECT 1 FROM pages WHERE template = 'venue' AND display_order = 3);
