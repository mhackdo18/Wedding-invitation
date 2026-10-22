-- Prevent anonymous/bot-only chat sessions:
-- 1. Bot messages can only be inserted if a visitor message already exists in that session
-- 2. Visitor messages must have a non-empty name

CREATE OR REPLACE FUNCTION enforce_chat_message_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visitor_exists boolean;
BEGIN
  -- Visitor messages must have a non-empty name
  IF NEW.role = 'visitor' THEN
    IF NEW.name IS NULL OR btrim(NEW.name) = '' THEN
      RAISE EXCEPTION 'Visitor messages must include a name';
    END IF;
  END IF;

  -- Bot messages can only be inserted if a visitor message already exists in this session
  IF NEW.role = 'bot' THEN
    SELECT EXISTS(
      SELECT 1 FROM chat_messages
      WHERE session_id = NEW.session_id AND role = 'visitor'
    ) INTO visitor_exists;
    IF NOT visitor_exists THEN
      RAISE EXCEPTION 'Bot messages require at least one visitor message in the session first';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_chat_message_rules
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_chat_message_rules();