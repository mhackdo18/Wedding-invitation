/*
# Add RSVP visibility controls

1. New Columns
- `site_settings.show_rsvp_button` (boolean, default true): controls RSVP buttons in the welcome hero and desktop/mobile navigation.
- `site_settings.show_rsvp_section` (boolean, default true): controls the RSVP call-to-action section at the bottom of the public welcome page.

2. Modified Tables
- `site_settings` gains two nullable-safe boolean presentation settings. Existing sites keep their current RSVP visibility because both settings default to true.

3. Security
- No new tables or policies are introduced. The existing shared site_settings access rules remain in effect.

4. Important Notes
- These settings only change links and presentation on the public welcome page; the dedicated RSVP page remains available to existing direct links.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS show_rsvp_button boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_rsvp_section boolean NOT NULL DEFAULT true;