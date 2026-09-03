/*
# Create central tags table

## Summary
Creates a single `tags` table that acts as the canonical source of all tag labels
used across the platform — guests, RSVP questions, sub-questions, and information
blocks. This replaces the ad-hoc "scan every row for tags" approach in the
frontend with a dedicated table that the Manage Tags modal can add to and remove
from, and that the TagInput autocomplete can use for suggestions.

## New Tables
- `tags`
  - `id` (uuid, primary key)
  - `name` (text, unique, not null) — the tag label
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `tags`.
- This is a single-tenant admin-managed lookup table. The public site reads
  guest tags through the `guests` table (already governed by its own policies),
  and the admin panel manages tag labels here. We allow `anon, authenticated`
  read (so the public RSVP wizard can fetch tag suggestions when a guest is
  filling out their RSVP) and `anon, authenticated` write (the admin panel
  writes with the anon key, same as all other admin tables in this project).

## Notes
1. Tags are referenced by name (not by id) in `guests.tags`,
   `rsvp_questions.guest_tags`, sub-question `guest_tags`, and
   `information_blocks` config JSON. The `tags` table is a registry of which
   tag labels exist — deleting a row here does not cascade to those arrays
   (they are plain text arrays / JSON), so the frontend Manage Tags modal
   is responsible for also cleaning up references when removing a tag.
2. Unique constraint on `name` prevents duplicate tag labels.
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tags" ON tags;
CREATE POLICY "anon_select_tags" ON tags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tags" ON tags;
CREATE POLICY "anon_insert_tags" ON tags FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tags" ON tags;
CREATE POLICY "anon_update_tags" ON tags FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tags" ON tags;
CREATE POLICY "anon_delete_tags" ON tags FOR DELETE
  TO anon, authenticated USING (true);
