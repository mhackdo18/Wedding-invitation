/*
# Split RSVP button visibility controls

1. Purpose
- Separate the RSVP button visibility setting into independent controls for the Welcome page and the top navigation.
- Preserve the existing `show_rsvp_button` choice when initializing the new settings.

2. Modified Tables
- `site_settings`
- Add `show_rsvp_on_welcome` (boolean, defaults to true): controls RSVP buttons rendered inside the Welcome page layouts.
- Add `show_rsvp_in_navigation` (boolean, defaults to true): controls RSVP buttons rendered in desktop and mobile navigation.

3. Compatibility
- Existing `show_rsvp_button` is retained so older backups and clients remain readable.
- New columns are initialized from the existing value for the singleton settings row.

4. Security
- No new tables or policies.
- Existing `site_settings` row-level security and column access remain unchanged.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS show_rsvp_on_welcome boolean NOT NULL DEFAULT true;

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS show_rsvp_in_navigation boolean NOT NULL DEFAULT true;

UPDATE site_settings
SET
  show_rsvp_on_welcome = COALESCE(show_rsvp_button, true),
  show_rsvp_in_navigation = COALESCE(show_rsvp_button, true)
WHERE show_rsvp_on_welcome = true
  AND show_rsvp_in_navigation = true;
