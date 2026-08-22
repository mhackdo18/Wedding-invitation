/*
# Add gate password styling columns

1. New Columns on `site_settings`
- `gate_title_color` (text, nullable) — font color for the gate title and subtitle
- `gate_title_font` (text, nullable) — font family for the gate title
- `gate_button_bg_color` (text, nullable) — background color of the gate submit button
- `gate_button_text_color` (text, nullable) — text color of the gate submit button
- `gate_button_radius` (integer, nullable) — corner radius of the gate submit button

2. Security
- No RLS changes. Existing policies on `site_settings` remain unchanged.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS gate_title_color text,
  ADD COLUMN IF NOT EXISTS gate_title_font text,
  ADD COLUMN IF NOT EXISTS gate_button_bg_color text,
  ADD COLUMN IF NOT EXISTS gate_button_text_color text,
  ADD COLUMN IF NOT EXISTS gate_button_radius integer;