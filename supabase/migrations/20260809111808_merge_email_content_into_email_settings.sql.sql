/*
# Merge invitation email fields into email_settings

1. Modified Tables
- `email_settings`: add columns for invitation email content previously stored on site_settings:
  - email_photo_url (text, nullable) — hero photo in the email
  - email_body_html (text, nullable) — HTML/plain body with merge tags
  - email_attachments (jsonb, default '[]') — array of {name, url}
  These let EmailSettings own ALL email content, removing duplication with site_settings.
2. Security
- No RLS changes — existing policies cover new columns automatically.
3. Notes
- Data migration copies current values from site_settings → email_settings so nothing is lost.


ALTER TABLE email_settings
  ADD COLUMN IF NOT EXISTS email_photo_url text,
  ADD COLUMN IF NOT EXISTS email_body_html text,
  ADD COLUMN IF NOT EXISTS email_attachments jsonb DEFAULT '[]'::jsonb;

-- Copy existing invitation email content from site_settings into email_settings
UPDATE email_settings es
SET
  email_photo_url = ss.invitation_email_photo_url,
  email_body_html = ss.invitation_email_body_html,
  email_attachments = COALESCE(ss.invitation_email_attachments, '[]'::jsonb),
  subject_line = COALESCE(NULLIF(TRIM(es.subject_line), ''), ss.invitation_email_subject),
  email_body = COALESCE(NULLIF(TRIM(es.email_body), ''), ss.invitation_paper_body)
FROM site_settings ss;
*/