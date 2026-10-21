ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS faq_chat_auth_username text,
  ADD COLUMN IF NOT EXISTS faq_chat_auth_password text;