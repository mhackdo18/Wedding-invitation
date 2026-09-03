/*
# Envelope customization, CTA customization, welcome layouts, RSVP question-event linking

1. Modified Tables
- site_settings: add welcome_layout, cta_text, cta_bg_color, cta_text_color, cta_radius, cta_size,
  env_color, env_liner_color, seal_color, seal_style, env_greeting, env_button_text
- rsvp_questions: add event_id (FK to events) for linking questions to specific events

2. Security
- No new tables. Existing RLS policies already cover these columns (all columns allowed).
*/

-- ============ site_settings: add customization columns ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='welcome_layout') THEN
    ALTER TABLE site_settings ADD COLUMN welcome_layout text NOT NULL DEFAULT 'centered';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='cta_text') THEN
    ALTER TABLE site_settings ADD COLUMN cta_text text NOT NULL DEFAULT 'RSVP Now';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='cta_bg_color') THEN
    ALTER TABLE site_settings ADD COLUMN cta_bg_color text NOT NULL DEFAULT '#8a6d3b';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='cta_text_color') THEN
    ALTER TABLE site_settings ADD COLUMN cta_text_color text NOT NULL DEFAULT '#ffffff';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='cta_radius') THEN
    ALTER TABLE site_settings ADD COLUMN cta_radius int NOT NULL DEFAULT 8;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='cta_size') THEN
    ALTER TABLE site_settings ADD COLUMN cta_size text NOT NULL DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_color') THEN
    ALTER TABLE site_settings ADD COLUMN env_color text NOT NULL DEFAULT '#b5462f';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_liner_color') THEN
    ALTER TABLE site_settings ADD COLUMN env_liner_color text NOT NULL DEFAULT '#f0e0c8';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='seal_color') THEN
    ALTER TABLE site_settings ADD COLUMN seal_color text NOT NULL DEFAULT '#8c1010';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='seal_style') THEN
    ALTER TABLE site_settings ADD COLUMN seal_style text NOT NULL DEFAULT 'monogram';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_greeting') THEN
    ALTER TABLE site_settings ADD COLUMN env_greeting text DEFAULT 'You are cordially invited to celebrate our wedding';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_button_text') THEN
    ALTER TABLE site_settings ADD COLUMN env_button_text text NOT NULL DEFAULT 'Open Invitation';
  END IF;
END $$;

-- ============ rsvp_questions: add event_id ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_questions' AND column_name='event_id') THEN
    ALTER TABLE rsvp_questions ADD COLUMN event_id uuid REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;
