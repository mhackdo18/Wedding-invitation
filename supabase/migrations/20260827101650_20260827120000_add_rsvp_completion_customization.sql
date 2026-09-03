/*
# Add RSVP completion customization

1. New columns on `site_settings`
- `rsvp_thank_you_title`: Custom heading shown after a guest submits an RSVP.
- `rsvp_thank_you_font`: Font used for the completion heading and message.
- `rsvp_thank_you_font_size`: Heading size in pixels for the completion message.
- `rsvp_thank_you_text_color`: Text color used by the completion heading and message.
- `rsvp_thank_you_hero_image_url`: Optional image shown in place of the monogram after submission.

2. Modified behavior
- The RSVP completion screen can be customized from the admin Settings page.
- Existing `rsvp_thank_you_message` remains the customizable supporting message.

3. Security
- No new tables or policies are introduced. Existing `site_settings` access rules remain unchanged.

4. Compatibility
- All new columns are nullable so existing sites continue using the current defaults until customized.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS rsvp_thank_you_title text,
  ADD COLUMN IF NOT EXISTS rsvp_thank_you_font text,
  ADD COLUMN IF NOT EXISTS rsvp_thank_you_font_size integer,
  ADD COLUMN IF NOT EXISTS rsvp_thank_you_text_color text,
  ADD COLUMN IF NOT EXISTS rsvp_thank_you_hero_image_url text;