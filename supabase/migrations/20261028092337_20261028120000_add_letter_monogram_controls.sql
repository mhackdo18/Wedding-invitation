/*
# Add monogram controls to the invitation letter

1. New columns on `site_settings`
- `invitation_paper_show_monogram` (boolean, default true) — controls whether the monogram appears at the top of the letter paper for each guest and on the public invitation page.
- `invitation_paper_monogram_size` (integer, default 48) — monogram size in pixels on the letter paper.

2. Security
- No new tables, policies, or grants required.
- Existing `site_settings` access rules continue to protect saved settings.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS invitation_paper_show_monogram boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS invitation_paper_monogram_size integer DEFAULT 48;