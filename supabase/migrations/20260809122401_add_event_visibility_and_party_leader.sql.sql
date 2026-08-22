/*
# Add event visibility controls and party leader flag

1. Modified Tables
- `events`: add two boolean columns to control what's shown on the public schedule:
  - `show_location` (boolean, default true) — whether the GPS/location banner appears below the event description
  - `show_venue_photo` (boolean, default true) — whether the venue photo appears on the event card
- `guests`: add `is_party_leader` (boolean, default false) — marks the primary contact for a party, shown at the top of grouped party lists

2. Security
- No RLS changes — existing policies cover new columns automatically.

3. Notes
- All columns default to true/false so existing data is unaffected.
- The first guest in each party (by created_at) is set as the party leader during migration.
*/

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS show_location boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_venue_photo boolean DEFAULT true;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS is_party_leader boolean DEFAULT false;

-- Set the earliest-created guest in each party as the leader
UPDATE guests SET is_party_leader = true
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY created_at) AS rn
    FROM guests WHERE party_id IS NOT NULL
  ) sub WHERE rn = 1
);
