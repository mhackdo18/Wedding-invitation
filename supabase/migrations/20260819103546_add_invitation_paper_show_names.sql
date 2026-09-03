/*
# Add invitation paper show-names toggle

1. New Column on `site_settings`
- `invitation_paper_show_names` (boolean, default true) — controls whether the
  partner 1 & partner 2 name headings appear on the invitation letter paper.

2. Security
- No RLS changes.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS invitation_paper_show_names boolean DEFAULT true;