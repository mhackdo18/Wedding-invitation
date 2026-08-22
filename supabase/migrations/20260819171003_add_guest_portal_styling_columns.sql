/*
# Add guest portal styling columns

1. Modified Tables
- `site_settings`
  - `portal_button_bg_color` (text, nullable) — background color of the submit button on the guest self-registration portal
  - `portal_button_text_color` (text, nullable) — text color of the submit button on the guest self-registration portal
  - `portal_bg_color` (text, nullable) — page background color of the guest self-registration portal
2. Security
- No RLS changes. Existing policies on `site_settings` remain unchanged.
3. Notes
- All three columns are optional (nullable). The portal page falls back to defaults when they are null.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS portal_button_bg_color text,
  ADD COLUMN IF NOT EXISTS portal_button_text_color text,
  ADD COLUMN IF NOT EXISTS portal_bg_color text;
