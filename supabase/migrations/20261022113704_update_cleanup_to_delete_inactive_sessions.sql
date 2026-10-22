-- Replace per-message cleanup with whole-session cleanup:
-- Deletes all messages for sessions whose LAST activity is older than the retention period.

DROP FUNCTION IF EXISTS cleanup_old_chat_messages(int);

CREATE FUNCTION cleanup_old_chat_messages(retention_days int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
  inactive_sessions text[];
BEGIN
  -- Find sessions whose most recent message is older than the retention window
  SELECT COALESCE(array_agg(DISTINCT session_id), ARRAY[]::text[]) INTO inactive_sessions
  FROM chat_messages
  GROUP BY session_id
  HAVING MAX(created_at) < now() - (retention_days || ' days')::interval;

  -- Delete all messages belonging to those inactive sessions
  DELETE FROM chat_messages
  WHERE session_id = ANY(inactive_sessions);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;