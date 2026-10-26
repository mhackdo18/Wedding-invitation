/*
# Add RSVP page design settings

1. Modified Tables
- `site_settings.rsvp_design`: JSON configuration for the RSVP page's visual presentation.
- The value stores independent typography settings for RSVP text elements and shared styling for RSVP action buttons.

2. Plain-English behavior
- Site administrators can customize RSVP fonts, font sizes, text colors, backgrounds, borders, button radius, and button size from the RSVP Builder.
- Existing sites receive an empty configuration and continue using the current RSVP appearance through application defaults.

3. Security
- No new tables are introduced.
- The existing single-wedding `site_settings` table and its anon/authenticated access policy remain unchanged.

4. Important Notes
- The column is JSONB so related RSVP design settings stay together and can be extended without creating a separate table for each visual property.
- Existing RSVP answers, questions, guest records, and other site settings are not changed.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS rsvp_design jsonb NOT NULL DEFAULT '{}'::jsonb;
