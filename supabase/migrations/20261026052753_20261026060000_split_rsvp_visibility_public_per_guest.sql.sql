/*
# Split RSVP visibility into per-guest and public controls

1. Purpose
- The existing three RSVP visibility toggles (show_rsvp_on_welcome,
  show_rsvp_in_navigation, show_rsvp_section) currently drive BOTH the
  per-guest invitation page and the shared public page together.
- Couples often want different RSVP visibility for the public website vs.
  the personal invitation each guest receives. This migration adds three
  new public-page toggles so each audience can be controlled independently.

2. New Columns (site_settings)
- show_rsvp_on_welcome_public (boolean, NOT NULL, default true):
    controls the RSVP button on the Welcome hero of the PUBLIC page.
- show_rsvp_in_navigation_public (boolean, NOT NULL, default true):
    controls the RSVP button in desktop/mobile navigation of the PUBLIC page.
- show_rsvp_section_public (boolean, NOT NULL, default true):
    controls the RSVP call-to-action section at the bottom of the PUBLIC page.

3. Reinterpretation of Existing Columns
- show_rsvp_on_welcome, show_rsvp_in_navigation, show_rsvp_section are now
  the PER-GUEST (invitation page) controls. Their meaning is unchanged for
  the invitation page; only the public page switches to the new columns.

4. Compatibility / Seed
- New public columns are initialized from the existing shared values so
  current sites keep their existing behavior until the couple changes them.
- The legacy show_rsvp_button column is retained untouched for backups.

5. Security
- No new tables, policies, or grants. Existing site_settings RLS and
  column access remain unchanged.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS show_rsvp_on_welcome_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_rsvp_in_navigation_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_rsvp_section_public boolean NOT NULL DEFAULT true;

-- Seed the new public toggles from the current shared toggles so behavior
-- is preserved for existing sites on first load.
UPDATE site_settings
SET
  show_rsvp_on_welcome_public = COALESCE(show_rsvp_on_welcome, true),
  show_rsvp_in_navigation_public = COALESCE(show_rsvp_in_navigation, true),
  show_rsvp_section_public = COALESCE(show_rsvp_section, true)
WHERE
  show_rsvp_on_welcome_public = true
  AND show_rsvp_in_navigation_public = true
  AND show_rsvp_section_public = true;
