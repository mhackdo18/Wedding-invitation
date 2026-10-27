/*
# Add invitation letter date and divider styling

1. New site_settings columns
- `invitation_paper_show_date` (boolean) — controls whether the wedding date appears on the invitation letter. Existing letters keep showing the date by default.
- `invitation_paper_date_font` (text) — font family used for the wedding date on the invitation letter.
- `invitation_paper_date_color` (text) — text color used for the wedding date on the invitation letter.
- `invitation_paper_divider_color` (text) — color used for the decorative divider lines on the invitation letter.

2. Modified behavior
- Adds optional presentation settings only; no existing invitation content is removed or renamed.
- Defaults preserve the current visual treatment for existing invitations.

3. Security
- No new tables, grants, or row-level security policies are required.
- The existing site_settings access rules continue to protect these settings.

4. Important notes
- The date setting is separate from the existing wedding date value, so hiding the date does not remove or change the wedding date itself.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS invitation_paper_show_date boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invitation_paper_date_font text,
  ADD COLUMN IF NOT EXISTS invitation_paper_date_color text,
  ADD COLUMN IF NOT EXISTS invitation_paper_divider_color text;
