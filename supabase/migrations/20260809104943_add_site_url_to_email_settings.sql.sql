/*
# Add site_url to email_settings

1. Modified Tables
- `email_settings`: add `site_url` (text, nullable) — the public base URL for invitation links
   (e.g. "https://your-wedding-site.com"). Used by the send-invitations edge function to build
   personalized invitation links like {site_url}/invite/{token}.
2. Security
- No RLS changes — table already has policies.
3. Notes
- Column is nullable so existing rows are unaffected.
- The admin Email Settings UI will let the couple set this value.
*/

ALTER TABLE email_settings
  ADD COLUMN IF NOT EXISTS site_url text;
