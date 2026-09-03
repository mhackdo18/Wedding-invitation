/*
# Add curtain style, animation speed, and size controls for doors

## Purpose
- Add `door_animation_speed` to control how fast doors open (slow / normal / fast)
- Add size multipliers for the three text elements on the doors: names, date, monogram
- All nullable with sensible defaults so existing rows are unaffected

## New columns on `site_settings`
- `door_animation_speed` (text, default 'normal') — 'slow' | 'normal' | 'fast'
- `door_name_size` (numeric, default 1.0) — multiplier for partner names font size
- `door_date_size` (numeric, default 1.0) — multiplier for wedding date font size
- `door_monogram_size` (numeric, default 1.0) — multiplier for monogram symbol font size
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_animation_speed') THEN
    ALTER TABLE site_settings ADD COLUMN door_animation_speed text NOT NULL DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_name_size') THEN
    ALTER TABLE site_settings ADD COLUMN door_name_size numeric NOT NULL DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_date_size') THEN
    ALTER TABLE site_settings ADD COLUMN door_date_size numeric NOT NULL DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_monogram_size') THEN
    ALTER TABLE site_settings ADD COLUMN door_monogram_size numeric NOT NULL DEFAULT 1.0;
  END IF;
END $$;