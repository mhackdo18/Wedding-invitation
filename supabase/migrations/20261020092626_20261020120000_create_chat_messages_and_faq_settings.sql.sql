/*
# FAQ Chat Box: chat_messages table + site settings fields

1. New Tables
- `chat_messages`
  - `id` (uuid, primary key)
  - `session_id` (text, not null) — unique per visitor device, stored in browser local storage
  - `role` (text, not null) — 'visitor' or 'bot'
  - `name` (text) — sender display name
  - `message` (text, not null) — the message content
  - `created_at` (timestamptz, default now())
  - Index on `session_id` for fast per-session lookups

2. Security
- Enable RLS on `chat_messages`.
- No sign-in screen on this app, so policies are scoped to `anon, authenticated`.
- SELECT: anyone can read messages for any session (needed so a visitor can read n8n's bot replies for their own session; session_id acts as the shared key).
- INSERT: anyone can insert a message (visitor writes their own; n8n writes bot replies via anon key).

3. Realtime
- Added `chat_messages` to the supabase_realtime publication so the widget receives n8n replies instantly.

4. site_settings additions
- `faq_chat_enabled` (boolean, default false) — master on/off toggle for the chat widget
- `faq_chat_webhook_url` (text, nullable) — n8n webhook URL to POST visitor messages to
- `faq_chat_greeting` (text, nullable) — optional greeting message shown when the chat opens
- `faq_chat_button_label` (text, nullable) — optional button label (not currently used in UI but stored for future)

5. Notes
- Session id is generated client-side and stored in localStorage; it is not a secret.
- n8n writes bot replies back to this same table with the matching session_id; Supabase Realtime delivers them to the visitor's open chat panel.
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('visitor', 'bot')),
  name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages (session_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_chat_messages" ON chat_messages;
CREATE POLICY "read_chat_messages"
ON chat_messages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages"
ON chat_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS faq_chat_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faq_chat_webhook_url text,
  ADD COLUMN IF NOT EXISTS faq_chat_greeting text,
  ADD COLUMN IF NOT EXISTS faq_chat_button_label text;