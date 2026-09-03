/*
# Add site monogram URL column

1. Modified Tables
- `site_settings`: add `site_monogram_url` (text, nullable) — stores the monogram image
  used in place of the heart icon across the public site footer, navigation, and
  standalone pages (Find Your Table, Guest Portal, Password Gate).

2. Security
- No RLS policy changes — `site_settings` already has anon/authenticated CRUD policies.
- No new tables.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS site_monogram_url text;
