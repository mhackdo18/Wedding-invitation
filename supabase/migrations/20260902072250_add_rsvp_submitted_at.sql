/*
# Add rsvp_submitted_at column to guests

1. Changes
- Adds `rsvp_submitted_at` (timestamptz, nullable) to `guests` table.
- This column records the date and time a guest submits their RSVP.
- It is set automatically by the frontend when the guest confirms or declines.
- It is cleared automatically by the existing RSVP reset trigger when status changes to pending.

2. Security
- No new tables.
- No RLS policy changes needed — the column is readable/writable through existing guest policies.
*/

ALTER TABLE guests ADD COLUMN IF NOT EXISTS rsvp_submitted_at timestamptz;

-- Update the existing RSVP reset trigger function to also clear rsvp_submitted_at
CREATE OR REPLACE FUNCTION clear_rsvp_data_on_pending()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rsvp_status = 'pending' AND OLD.rsvp_status IS DISTINCT FROM NEW.rsvp_status THEN
    NEW.attendance := '{}'::jsonb;
    NEW.dietary := NULL;
    NEW.plus_one_name := NULL;
    NEW.song_requests := NULL;
    NEW.proxy_guest_name := NULL;
    NEW.rsvp_submitted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
