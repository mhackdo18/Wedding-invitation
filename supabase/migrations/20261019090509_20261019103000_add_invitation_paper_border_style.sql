/*
# Add invitation paper border design

1. New columns
- `site_settings.invitation_paper_border_style` stores the selected border design for the guest invitation letter.
- Supported application values are `none`, `solid`, `double`, `dashed`, and `dotted`.

2. Modified tables
- `site_settings` gains one nullable text setting. Existing invitation designs remain unchanged because the application defaults missing values to `solid`.

3. Security
- No new tables or policies are introduced. Existing `site_settings` access rules remain unchanged.

4. Important notes
- This is additive only and does not remove or alter existing data.
- The existing paper border color continues to control the selected border's color.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS invitation_paper_border_style text;