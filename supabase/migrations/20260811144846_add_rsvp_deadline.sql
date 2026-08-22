/*
# Add RSVP deadline to site settings

1. New Columns
- `site_settings.rsvp_deadline` (timestamptz, nullable) — optional date/time by which guests should respond.

2. Modified Tables
- `site_settings` gains one nullable column; existing data is untouched.

3. Security
- Existing shared site_settings policies remain in effect.

4. Important Notes
- A null value means no deadline is shown to guests.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS rsvp_deadline timestamptz;
