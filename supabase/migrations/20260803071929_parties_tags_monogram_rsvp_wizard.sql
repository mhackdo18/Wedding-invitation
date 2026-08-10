/*
# Party system, guest tags, monogram envelope, RSVP wizard question enhancements

1. New Tables
- parties (id, name, guest_token unique for personalized URLs)

2. Modified Tables
- guests: add party_id (FK parties), tags (text[]), plus_one_allowed (bool default true),
  remove party_size/plus_ones (replaced by party system) — we keep them for compat but add new cols
- site_settings: add monogram_url, letter_body, letter_font, env_liner_pattern
- rsvp_questions: add yes_text, no_text, is_attendance, guest_tags (text[]), remove event_id top-level link
  (event linking now happens via is_attendance questions that reference main events through event_id still)

3. Security
- RLS on parties, anon+authenticated CRUD (single-tenant public app)
*/

-- ============ parties ============
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  guest_token text UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_parties" ON parties;
CREATE POLICY "anon_crud_parties" ON parties
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ guests: add party_id, tags, plus_one_allowed ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='party_id') THEN
    ALTER TABLE guests ADD COLUMN party_id uuid REFERENCES parties(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='tags') THEN
    ALTER TABLE guests ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='plus_one_allowed') THEN
    ALTER TABLE guests ADD COLUMN plus_one_allowed boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============ site_settings: add monogram + letter body fields ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='monogram_url') THEN
    ALTER TABLE site_settings ADD COLUMN monogram_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='letter_body') THEN
    ALTER TABLE site_settings ADD COLUMN letter_body text DEFAULT 'Dear {{guest_name}},\n\nWe would be absolutely delighted if you could join us on our special day. Please find your invitation enclosed and let us know if you can make it.\n\nWith love,\n{{partner1_name}} & {{partner2_name}}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='letter_font') THEN
    ALTER TABLE site_settings ADD COLUMN letter_font text DEFAULT 'Cormorant Garamond';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_liner_pattern') THEN
    ALTER TABLE site_settings ADD COLUMN env_liner_pattern text NOT NULL DEFAULT 'solid';
  END IF;
END $$;

-- ============ rsvp_questions: add yes/no text, attendance flag, guest tags ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_questions' AND column_name='yes_text') THEN
    ALTER TABLE rsvp_questions ADD COLUMN yes_text text DEFAULT 'Joyfully Accepts';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_questions' AND column_name='no_text') THEN
    ALTER TABLE rsvp_questions ADD COLUMN no_text text DEFAULT 'Regretfully Declines';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_questions' AND column_name='is_attendance') THEN
    ALTER TABLE rsvp_questions ADD COLUMN is_attendance boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_questions' AND column_name='guest_tags') THEN
    ALTER TABLE rsvp_questions ADD COLUMN guest_tags text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- ============ Seed a sample party ============
DO $$
DECLARE
  party_id uuid;
BEGIN
  SELECT id INTO party_id FROM parties LIMIT 1;
  IF party_id IS NULL THEN
    INSERT INTO parties (name, guest_token) VALUES ('The Miller Family', 'miller-family-2025') RETURNING id INTO party_id;
  END IF;
END $$;
