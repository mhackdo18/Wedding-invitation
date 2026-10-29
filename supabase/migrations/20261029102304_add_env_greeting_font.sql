/*
# Add envelope greeting font setting

1. New column on `site_settings`
- `env_greeting_font` (text, default 'Cormorant Garamond') — font used for the envelope greeting text and the "Tap the seal to open" hint shown before the envelope opens.

2. Security
- No new tables, policies, or grants required.
- Existing `site_settings` access rules continue to protect saved settings.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS env_greeting_font text DEFAULT 'Cormorant Garamond';