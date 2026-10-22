/*
# Secure chat message deletion for the admin conversation manager

1. Purpose
- Fix chat sessions returning after refresh because deletion was not covered by an explicit row-level policy.
- Keep the public guest chat able to read conversations and submit visitor messages.
- Allow signed-in admin users to manage and delete chat sessions.

2. Access changes
- Enable row-level security on `chat_messages`.
- Anonymous visitors can SELECT and INSERT chat messages only.
- Authenticated admin users can SELECT, INSERT, UPDATE, and DELETE chat messages.
- Anonymous users cannot update or delete any chat message.

3. Data safety
- No rows are removed by this migration.
- Existing messages, columns, indexes, and realtime configuration remain unchanged.
*/

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE, DELETE ON public.chat_messages FROM anon;
GRANT SELECT, INSERT ON public.chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

DROP POLICY IF EXISTS "read_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "insert_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "update_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "delete_chat_messages" ON public.chat_messages;

CREATE POLICY "read_chat_messages"
ON public.chat_messages FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "insert_chat_messages"
ON public.chat_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "update_chat_messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "delete_chat_messages"
ON public.chat_messages FOR DELETE
TO authenticated
USING (true);
