/*
# Add guest portal text styling columns

1. Modified Tables
- `site_settings`
  - `portal_text_color` (text, nullable) — text color used for headings and body text on the guest self-registration portal
  - `portal_text_font` (text, nullable) — font family used for headings and body text on the guest self-registration portal
2. Security
- No RLS changes. Existing policies on `site_settings` remain unchanged.
3. Notes
- Both columns are optional (nullable). The portal page falls back to defaults when null.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS portal_text_color text,
  ADD COLUMN IF NOT EXISTS portal_text_font text;
