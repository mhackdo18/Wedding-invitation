/*
# Auto-clear RSVP data when guest status resets to pending

## Purpose
When a guest's `rsvp_status` is updated to `'pending'` (whether individually or in bulk),
this trigger automatically clears ALL associated RSVP data from every table that stores it.
This ensures a clean state so the guest can re-RSVP from scratch.

## What gets cleared
1. `guest_event_rsvps` — all per-event attendance rows for this guest are DELETED
2. `rsvp_answers` — all custom question answers for this guest are DELETED
3. `guests` row itself — these columns are reset to defaults:
   - `attendance` → `{}` (empty jsonb object)
   - `dietary` → `NULL`
   - `plus_one_name` → `NULL`
   - `plus_ones` → `0`
   - `song_requests` → `NULL`
   - `checked_in` → `false`
   - `checked_in_at` → `NULL`

## How it works
- A trigger function `clear_guest_rsvp_data()` fires `AFTER UPDATE` on the `guests` table.
- It only acts when `NEW.rsvp_status = 'pending'` AND `OLD.rsvp_status IS DISTINCT FROM 'pending'`
  (so it doesn't re-clear if the status was already pending).
- It deletes child rows from `guest_event_rsvps` and `rsvp_answers`.
- It updates the `guests` row itself to reset the RSVP-related columns.

## Security
- No RLS or policy changes — the trigger runs with definer privileges (SECURITY DEFINER)
  so it can clean up child tables even if the calling role lacks direct DELETE access.
- The function is owned by the postgres user and only fires on UPDATE to `guests`.

## Idempotency
- The trigger is safe to re-run. `DROP FUNCTION IF EXISTS` and `DROP TRIGGER IF EXISTS`
  are used before creation.
*/

DROP TRIGGER IF EXISTS on_guest_rsvp_reset ON guests;
DROP FUNCTION IF EXISTS clear_guest_rsvp_data();

CREATE OR REPLACE FUNCTION clear_guest_rsvp_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when transitioning TO pending from a non-pending status
  IF NEW.rsvp_status = 'pending' AND OLD.rsvp_status IS DISTINCT FROM 'pending' THEN
    -- Delete per-event RSVP rows
    DELETE FROM guest_event_rsvps WHERE guest_id = NEW.id;
    -- Delete custom question answers
    DELETE FROM rsvp_answers WHERE guest_id = NEW.id;
    -- Reset RSVP-related columns on the guest row
    UPDATE guests
      SET attendance = '{}'::jsonb,
          dietary = NULL,
          plus_one_name = NULL,
          plus_ones = 0,
          song_requests = NULL,
          checked_in = false,
          checked_in_at = NULL
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_guest_rsvp_reset
  AFTER UPDATE OF rsvp_status ON guests
  FOR EACH ROW
  EXECUTE FUNCTION clear_guest_rsvp_data();
