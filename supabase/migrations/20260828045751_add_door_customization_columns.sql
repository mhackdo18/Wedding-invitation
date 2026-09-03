/*
# Add door customization columns to site_settings

## Purpose
Allows customization of the ceremonial doors that open to reveal the wedding site.
Couples can choose a door style, color, and control which text elements appear
on the doors (partner names, wedding date, monogram) with custom fonts and colors.

## New columns on `site_settings`
- `door_style` (text, default 'classic') — visual style of the doors: classic, arched, paneled, rustic, modern
- `door_color` (text, nullable) — base color for the door panels
- `door_show_names` (boolean, default true) — show partner 1 name on left door, partner 2 on right
- `door_name_font` (text, default 'Great Vibes') — font for door names
- `door_name_color` (text, nullable) — color for door names
- `door_show_date` (boolean, default true) — show wedding date below the names on the center seam
- `door_date_font` (text, default 'Cormorant Garamond') — font for the date
- `door_date_color` (text, nullable) — color for the date text
- `door_show_monogram` (boolean, default true) — show monogram/initials on the center seam
- `door_monogram_color` (text, nullable) — color for the monogram symbol

## Security
No new tables. No RLS changes. Existing policies on site_settings remain unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_style') THEN
    ALTER TABLE site_settings ADD COLUMN door_style text NOT NULL DEFAULT 'classic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_color') THEN
    ALTER TABLE site_settings ADD COLUMN door_color text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_show_names') THEN
    ALTER TABLE site_settings ADD COLUMN door_show_names boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_name_font') THEN
    ALTER TABLE site_settings ADD COLUMN door_name_font text NOT NULL DEFAULT 'Great Vibes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_name_color') THEN
    ALTER TABLE site_settings ADD COLUMN door_name_color text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_show_date') THEN
    ALTER TABLE site_settings ADD COLUMN door_show_date boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_date_font') THEN
    ALTER TABLE site_settings ADD COLUMN door_date_font text NOT NULL DEFAULT 'Cormorant Garamond';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_date_color') THEN
    ALTER TABLE site_settings ADD COLUMN door_date_color text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_show_monogram') THEN
    ALTER TABLE site_settings ADD COLUMN door_show_monogram boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'door_monogram_color') THEN
    ALTER TABLE site_settings ADD COLUMN door_monogram_color text;
  END IF;
END $$;