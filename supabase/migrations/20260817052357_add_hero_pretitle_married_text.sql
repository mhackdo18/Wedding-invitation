/*
# Add customizable hero pretitle and married text

1. Modified Tables
- `site_settings`: add `hero_pretitle_text` (text, nullable) — custom text replacing "Together with their families" on the welcome page. Null = use default.
- `site_settings`: add `hero_married_text` (text, nullable) — custom text replacing "ARE GETTING MARRIED" on the welcome page. Null = use default.
2. Security
- No RLS changes needed — site_settings already has existing policies.
3. Notes
- Both columns are nullable so existing sites are unaffected. The frontend falls back to the original hardcoded strings when the value is null or empty.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='hero_pretitle_text') THEN
    ALTER TABLE site_settings ADD COLUMN hero_pretitle_text text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='hero_married_text') THEN
    ALTER TABLE site_settings ADD COLUMN hero_married_text text;
  END IF;
END $$;
