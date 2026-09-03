/*
# Add multi-event selection for attendance questions

1. Modified Tables
- `rsvp_questions`: add `event_ids` (text[]) column to support linking an attendance question to multiple events or "all events".
  - When `event_ids` contains the special value `'__all__'`, the attendance answer applies to ALL events the guest is invited to.
  - When `event_ids` contains specific event UUIDs, the attendance answer applies to those specific events.
  - Falls back to the legacy single `event_id` column when `event_ids` is null/empty (backward compatibility).

2. Security
- No RLS policy changes needed — existing policies on `rsvp_questions` already cover CRUD.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_questions' AND column_name='event_ids') THEN
    ALTER TABLE rsvp_questions ADD COLUMN event_ids text[] DEFAULT '{}';
  END IF;
END $$;
