/*
# Add preheader text column to email settings

1. Changes
- Adds `preheader_text` (nullable text) to the `email_settings` table.
- Stores the short preview line recipients see in their inbox before opening the email.
2. Notes
- Nullable so existing rows are unaffected.
- No RLS or policy changes needed (email_settings already has its own access controls).
*/

ALTER TABLE email_settings
  ADD COLUMN IF NOT EXISTS preheader_text text;
