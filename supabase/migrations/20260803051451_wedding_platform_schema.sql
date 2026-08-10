/*
# Wedding Invitation & Planning Platform - Core Schema

Single-tenant app (one wedding site). No auth/login screen, so all policies
use TO anon, authenticated with USING (true) / WITH CHECK (true) because the
data is intentionally public/shared for one wedding.

1. New Tables
- site_settings        : singleton wedding site config (colors, fonts, typography, couple info)
- venues               : wedding venues (address, map link)
- events               : main events + nested sub-events (parent_id self-reference)
- gallery_photos       : photos with layout template + display order
- rsvp_questions       : custom RSVP form builder questions
- guests               : guest list with RSVP status, party size, dietary, plus-ones
- guest_event_rsvps    : per-event RSVP responses (guest x event)
- rsvp_answers         : answers to custom questions per guest
- seating_tables       : tables with shape + capacity
- seat_assignments     : guest assigned to a seat at a table
- invitations          : per-guest invitation token + sent/opened tracking
- email_settings       : singleton SMTP/email config + subject/body templates

2. Relationships
- events.parent_id -> events.id (sub-events nest under main events)
- events.venue_id  -> venues.id
- guest_event_rsvps.guest_id -> guests.id, .event_id -> events.id
- rsvp_answers.guest_id -> guests.id, .question_id -> rsvp_questions.id
- seat_assignments.table_id -> seating_tables.id, .guest_id -> guests.id
- invitations.guest_id -> guests.id

3. Security
- RLS enabled on every table.
- anon + authenticated full CRUD (single public wedding site).
*/

-- ============ site_settings ============
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner1_name text NOT NULL DEFAULT 'Alex',
  partner2_name text NOT NULL DEFAULT 'Jordan',
  wedding_date timestamptz,
  venue_line text,
  story_title text DEFAULT 'Our Story',
  story_body text DEFAULT 'We met on a rainy afternoon...',
  hero_image_url text,
  page_color text NOT NULL DEFAULT '#FBF7F0',
  bg_color text NOT NULL DEFAULT '#E9DFD0',
  page_width int NOT NULL DEFAULT 720,
  heading_font text NOT NULL DEFAULT 'Cormorant Garamond',
  body_font text NOT NULL DEFAULT 'Montserrat',
  -- typography: { key: { fontFamily, fontSize, fontWeight, color } }
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  rsvp_intro text DEFAULT 'We hope you can join us!',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_site_settings" ON site_settings;
CREATE POLICY "anon_crud_site_settings" ON site_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ venues ============
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  map_url text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_venues" ON venues;
CREATE POLICY "anon_crud_venues" ON venues
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ events ============
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  parent_id uuid REFERENCES events(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  rsvp_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_id);
CREATE INDEX IF NOT EXISTS idx_events_order ON events(display_order);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_events" ON events;
CREATE POLICY "anon_crud_events" ON events
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ gallery_photos ============
CREATE TABLE IF NOT EXISTS gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  layout text NOT NULL DEFAULT 'masonry',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery_photos(display_order);
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_gallery_photos" ON gallery_photos;
CREATE POLICY "anon_crud_gallery_photos" ON gallery_photos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ rsvp_questions ============
CREATE TABLE IF NOT EXISTS rsvp_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_key text NOT NULL,
  input_type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rsvp_questions_order ON rsvp_questions(display_order);
ALTER TABLE rsvp_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_rsvp_questions" ON rsvp_questions;
CREATE POLICY "anon_crud_rsvp_questions" ON rsvp_questions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ guests ============
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  party_size int NOT NULL DEFAULT 1,
  plus_ones int NOT NULL DEFAULT 0,
  rsvp_status text NOT NULL DEFAULT 'pending',
  attendance jsonb NOT NULL DEFAULT '{}'::jsonb,
  dietary text,
  plus_one_name text,
  song_requests text,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(rsvp_status);
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_guests" ON guests;
CREATE POLICY "anon_crud_guests" ON guests
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ guest_event_rsvps ============
CREATE TABLE IF NOT EXISTS guest_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (guest_id, event_id)
);
ALTER TABLE guest_event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_guest_event_rsvps" ON guest_event_rsvps;
CREATE POLICY "anon_crud_guest_event_rsvps" ON guest_event_rsvps
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ rsvp_answers ============
CREATE TABLE IF NOT EXISTS rsvp_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES rsvp_questions(id) ON DELETE CASCADE,
  answer text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (guest_id, question_id)
);
ALTER TABLE rsvp_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_rsvp_answers" ON rsvp_answers;
CREATE POLICY "anon_crud_rsvp_answers" ON rsvp_answers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ seating_tables ============
CREATE TABLE IF NOT EXISTS seating_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shape text NOT NULL DEFAULT 'round',
  capacity int NOT NULL DEFAULT 8,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_seating_tables" ON seating_tables;
CREATE POLICY "anon_crud_seating_tables" ON seating_tables
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ seat_assignments ============
CREATE TABLE IF NOT EXISTS seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  seat_number int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (table_id, seat_number),
  UNIQUE (table_id, guest_id)
);
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_seat_assignments" ON seat_assignments;
CREATE POLICY "anon_crud_seat_assignments" ON seat_assignments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ invitations ============
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_invitations" ON invitations;
CREATE POLICY "anon_crud_invitations" ON invitations
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ email_settings ============
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'smtp',
  smtp_host text,
  smtp_port int,
  smtp_user text,
  smtp_pass text,
  from_email text,
  from_name text,
  subject_line text DEFAULT 'You are invited to our wedding!',
  email_body text DEFAULT 'We would be delighted to have you celebrate with us.',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_email_settings" ON email_settings;
CREATE POLICY "anon_crud_email_settings" ON email_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ Seed default site_settings singleton ============
INSERT INTO site_settings (id, partner1_name, partner2_name)
SELECT '00000000-0000-0000-0000-000000000001', 'Alex', 'Jordan'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- ============ Seed default email_settings singleton ============
INSERT INTO email_settings (id)
SELECT '00000000-0000-0000-0000-000000000002'
WHERE NOT EXISTS (SELECT 1 FROM email_settings);

-- ============ Seed default RSVP questions ============
INSERT INTO rsvp_questions (label, field_key, input_type, options, required, display_order)
SELECT 'Will you attend?', 'attendance', 'radio', '["Yes, with pleasure","Yes, but only part of the day","Regretfully, no"]'::jsonb, true, 1
WHERE NOT EXISTS (SELECT 1 FROM rsvp_questions);
INSERT INTO rsvp_questions (label, field_key, input_type, options, required, display_order)
SELECT 'Number of guests in your party', 'party_size', 'number', '[]'::jsonb, true, 2
WHERE NOT EXISTS (SELECT 1 FROM rsvp_questions WHERE field_key='party_size');
INSERT INTO rsvp_questions (label, field_key, input_type, options, required, display_order)
SELECT 'Plus-one name', 'plus_one_name', 'text', '[]'::jsonb, false, 3
WHERE NOT EXISTS (SELECT 1 FROM rsvp_questions WHERE field_key='plus_one_name');
INSERT INTO rsvp_questions (label, field_key, input_type, options, required, display_order)
SELECT 'Meal preference', 'meal', 'select', '["Chicken","Beef","Fish","Vegetarian"]'::jsonb, false, 4
WHERE NOT EXISTS (SELECT 1 FROM rsvp_questions WHERE field_key='meal');
INSERT INTO rsvp_questions (label, field_key, input_type, options, required, display_order)
SELECT 'Dietary restrictions', 'dietary', 'text', '[]'::jsonb, false, 5
WHERE NOT EXISTS (SELECT 1 FROM rsvp_questions WHERE field_key='dietary');
INSERT INTO rsvp_questions (label, field_key, input_type, options, required, display_order)
SELECT 'Song request', 'song_requests', 'text', '[]'::jsonb, false, 6
WHERE NOT EXISTS (SELECT 1 FROM rsvp_questions WHERE field_key='song_requests');


