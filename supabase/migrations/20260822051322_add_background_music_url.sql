/*
# Add background music URL to site settings

1. Modified Tables
- `site_settings`: add `music_url` (text, nullable) — stores the public URL of an uploaded audio file
  that plays in a loop as background music on the public site and guest portal.

2. Security
- No new tables. No RLS changes. The column is readable by anon/authenticated via the existing
  site_settings SELECT policy, and writable via the existing UPDATE policy.
*/

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS music_url text;
