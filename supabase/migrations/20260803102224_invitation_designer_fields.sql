/*
# Invitation Designer Fields

Adds invitation-specific styling columns to site_settings, and entourage
section-level font customization fields to the pages config schema.

1. site_settings — new invitation design columns:
   - invitation_envelope_color: envelope body color (hex)
   - invitation_wax_seal_color: wax seal color (hex)
   - invitation_wax_seal_image_url: uploaded monogram for seal
   - invitation_flap_show_name: whether to show guest name on flap
   - invitation_flap_name_text: custom flap text (supports {guest_name})
   - invitation_flap_name_color: flap name text color
   - invitation_flap_name_font: flap name font family
   - invitation_paper_background_color: letter paper background
   - invitation_paper_text_color: letter body text color
   - invitation_paper_border_color: letter paper border color
   - invitation_paper_image_url: background image on letter paper
   - invitation_paper_heading_font: heading font on letter
   - invitation_paper_body_font: body font on letter
   - invitation_paper_body: rich-text letter body (HTML string)
   - invitation_paper_buttons: jsonb array of CTA buttons on letter
   - invitation_email_photo_url: hero photo shown in email HTML
   - invitation_email_attachments: jsonb array of {name, url} attachments
   - invitation_email_subject: email subject line
   - invitation_email_body_html: full email HTML template
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS invitation_envelope_color       text,
  ADD COLUMN IF NOT EXISTS invitation_wax_seal_color       text,
  ADD COLUMN IF NOT EXISTS invitation_wax_seal_image_url   text,
  ADD COLUMN IF NOT EXISTS invitation_flap_show_name       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invitation_flap_name_text       text,
  ADD COLUMN IF NOT EXISTS invitation_flap_name_color      text,
  ADD COLUMN IF NOT EXISTS invitation_flap_name_font       text NOT NULL DEFAULT 'Great Vibes',
  ADD COLUMN IF NOT EXISTS invitation_paper_background_color text,
  ADD COLUMN IF NOT EXISTS invitation_paper_text_color     text,
  ADD COLUMN IF NOT EXISTS invitation_paper_border_color   text,
  ADD COLUMN IF NOT EXISTS invitation_paper_image_url      text,
  ADD COLUMN IF NOT EXISTS invitation_paper_heading_font   text,
  ADD COLUMN IF NOT EXISTS invitation_paper_body_font      text,
  ADD COLUMN IF NOT EXISTS invitation_paper_body           text,
  ADD COLUMN IF NOT EXISTS invitation_paper_buttons        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invitation_email_photo_url      text,
  ADD COLUMN IF NOT EXISTS invitation_email_attachments    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invitation_email_subject        text,
  ADD COLUMN IF NOT EXISTS invitation_email_body_html      text;
