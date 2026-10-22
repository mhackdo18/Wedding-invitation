-- Add bot name column to site_settings
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS faq_chat_bot_name text;

-- Add retention days setting
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS faq_chat_retention_days int NOT NULL DEFAULT 30;

-- Cleanup function for old chat messages
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages(retention_days int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM chat_messages
  WHERE created_at < now() - (retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_chat_messages(int) TO authenticated;