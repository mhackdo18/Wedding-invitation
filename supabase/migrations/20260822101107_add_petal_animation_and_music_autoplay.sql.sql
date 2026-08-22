/*
# Add petal animation settings and music autoplay toggle

1. New columns on site_settings:
- petal_animation_enabled (boolean, default false) — toggle falling petals/leaves on public pages
- petal_color (text, default '#c9b896') — color of the petals/leaves
- petal_size (integer, default 18) — size of each petal in px
- petal_count (integer, default 15) — number of petals on screen
- petal_speed (integer, default 8) — falling speed in seconds (lower = faster)
- music_autoplay (boolean, default true) — whether background music auto-plays on page load
2. Security: no changes — existing site_settings policies already cover these columns.
3. Notes: All columns are nullable-safe with defaults so existing rows work immediately.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS petal_animation_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS petal_color text DEFAULT '#c9b896',
  ADD COLUMN IF NOT EXISTS petal_size integer DEFAULT 18,
  ADD COLUMN IF NOT EXISTS petal_count integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS petal_speed integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS music_autoplay boolean DEFAULT true;
