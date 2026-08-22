/*
# Page Management, Story Milestones, Guest Check-in

1. New Tables
- pages
  - id, slug (unique URL key), title, template (welcome|story|gallery|schedule|rsvp|find-table|custom),
  - is_visible (bool), display_order (int), config (jsonb for template-specific settings)
- story_milestones
  - id, page_id -> pages, title, date, body, image_url, display_order

2. Modified Tables
- guests: add checked_in boolean DEFAULT false, checked_in_at timestamptz NULL

3. Seed
- Default pages: welcome (slug 'home'), story (slug 'story'), gallery (slug 'gallery'),
  schedule (slug 'schedule'), rsvp (slug 'rsvp'), find-table (slug 'find-your-table')
  All visible except find-table which starts hidden (linked from coordinator).

4. Security
- RLS enabled on new tables, anon+authenticated CRUD (single-tenant public app).
*/

-- ============ pages ============
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  template text NOT NULL DEFAULT 'custom',
  is_visible boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pages_order ON pages(display_order);
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_pages" ON pages;
CREATE POLICY "anon_crud_pages" ON pages
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ story_milestones ============
CREATE TABLE IF NOT EXISTS story_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  milestone_date date,
  body text,
  image_url text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_page ON story_milestones(page_id);
CREATE INDEX IF NOT EXISTS idx_milestones_order ON story_milestones(display_order);
ALTER TABLE story_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_story_milestones" ON story_milestones;
CREATE POLICY "anon_crud_story_milestones" ON story_milestones
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ guests: add check-in columns ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='checked_in') THEN
    ALTER TABLE guests ADD COLUMN checked_in boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='checked_in_at') THEN
    ALTER TABLE guests ADD COLUMN checked_in_at timestamptz;
  END IF;
END $$;

-- ============ Seed default pages ============
INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'home', 'Welcome', 'welcome', true, 0, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='home');

INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'story', 'Our Story', 'story', true, 1, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='story');

INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'gallery', 'Gallery', 'gallery', true, 2, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='gallery');

INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'schedule', 'Schedule', 'schedule', true, 3, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='schedule');

INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'rsvp', 'RSVP', 'rsvp', true, 4, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='rsvp');

INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'find-your-table', 'Find Your Table', 'find-table', true, 5, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='find-your-table');

-- ============ Seed sample story milestones ============
DO $$
DECLARE
  story_page uuid;
BEGIN
  SELECT id INTO story_page FROM pages WHERE slug='story' LIMIT 1;
  IF story_page IS NOT NULL AND NOT EXISTS (SELECT 1 FROM story_milestones WHERE page_id = story_page) THEN
    INSERT INTO story_milestones (page_id, title, milestone_date, body, image_url, display_order) VALUES
      (story_page, 'How We Met', '2021-09-15', 'A rainy afternoon, a crowded coffee shop, and a shared table that changed everything.', NULL, 0),
      (story_page, 'First Date', '2021-10-02', 'Dinner turned into a four-hour conversation that neither wanted to end.', NULL, 1),
      (story_page, 'The Proposal', '2025-12-24', 'Under a canopy of string lights, on a crisp winter evening, the question was finally asked.', NULL, 2);
  END IF;
END $$;
