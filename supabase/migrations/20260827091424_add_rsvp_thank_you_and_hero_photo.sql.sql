/*
# Add RSVP thank-you message and hero photo columns

1. New Columns on `site_settings`
- `rsvp_thank_you_message` (text) — custom message shown to guests on the RSVP confirmation/thank-you screen. Defaults to "Your RSVP has been received."
- `rsvp_hero_image_url` (text) — optional hero photo displayed at the top of the RSVP experience for guests.

2. Security
- No changes to RLS. Existing `anon_crud_site_settings` policy (anon + authenticated, USING true WITH CHECK true) already covers the new columns.

3. Notes
- Both columns are nullable so existing rows and the seed singleton work without backfill.
- Idempotent via IF NOT EXISTS.
*/

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS rsvp_thank_you_message text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS rsvp_hero_image_url text;
