/*
# Expand public password gate customization

1. New columns on `site_settings`
- `gate_message` (text) — custom text shown below the partner names.
- `gate_text_color` (text) — color for the custom message and supporting gate text.
- `gate_text_font` (text) — font family for the custom message.
- `gate_bg_color` (text) — full-page background color for the password gate.
- `gate_card_color` (text) — password card background color.
- `gate_background_image_url` (text) — optional uploaded background picture.
- `gate_show_partner_names` (boolean) — controls whether partner names appear.
- `gate_show_monogram` (boolean) — controls whether the monogram appears.
- `gate_monogram_position` (text) — stores the monogram position, defaulting to the top of the card.
- `gate_monogram_size` (integer) — monogram size in pixels.

2. Modified behavior
- Existing gate styling columns remain unchanged.
- Defaults preserve the existing gate colors and content while placing the monogram above the lock icon.

3. Security
- No new tables, policies, or grants are required.
- Existing `site_settings` access rules continue to protect saved settings.

4. Important notes
- The background picture remains optional; the color is used when no picture is selected.
- Existing rows receive safe defaults through nullable columns and column defaults.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS gate_message text,
  ADD COLUMN IF NOT EXISTS gate_text_color text,
  ADD COLUMN IF NOT EXISTS gate_text_font text,
  ADD COLUMN IF NOT EXISTS gate_bg_color text,
  ADD COLUMN IF NOT EXISTS gate_card_color text,
  ADD COLUMN IF NOT EXISTS gate_background_image_url text,
  ADD COLUMN IF NOT EXISTS gate_show_partner_names boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gate_show_monogram boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gate_monogram_position text DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS gate_monogram_size integer DEFAULT 72;