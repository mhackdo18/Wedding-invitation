-- pages: per-page hero photo
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_image_url text;

-- site_settings: envelope font color + footer customization
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS env_font_color text NOT NULL DEFAULT '#5a4430';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_monogram_url text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_text text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_bg_color text NOT NULL DEFAULT 'transparent';

-- rsvp_questions: new question types and conditional sub-questions
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'text';
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS sub_question text;
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS yes_label text;
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS no_label text;
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS terms_body text;
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS accept_label text;
ALTER TABLE rsvp_questions ADD COLUMN IF NOT EXISTS conditional_sub_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill question_type from input_type for existing rows
UPDATE rsvp_questions SET question_type = CASE
  WHEN is_attendance = true THEN 'attendance'
  WHEN input_type = 'radio' THEN 'multiple_choice'
  WHEN input_type = 'select' THEN 'multiple_choice'
  ELSE input_type
END WHERE question_type = 'text';
