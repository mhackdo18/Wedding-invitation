/*
# Add show_on_public column to pages table

1. New Columns
- `pages.show_on_public` (boolean, NOT NULL, default true)
  Controls whether a page appears on the public site only.
  Independent of `is_visible` (the master on/off toggle controlled by the eye icon),
  which still gates appearance on BOTH the public site and per-guest invitations.

2. Behavior
- Public site shows a page when: is_visible = true AND show_on_public = true AND (visible_tags is empty).
- Per-guest invitation shows a page when: is_visible = true, regardless of show_on_public.
  Tag filtering still applies on the invitation (tagged pages show only to guests whose tags match).

3. Migration notes
- Idempotent: only adds the column if it does not already exist.
- Existing pages default to show_on_public = true, preserving current behavior.
- No RLS / policy changes: the existing pages policies already cover anon + authenticated.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pages' AND column_name = 'show_on_public'
  ) THEN
    ALTER TABLE pages ADD COLUMN show_on_public boolean NOT NULL DEFAULT true;
  END IF;
END $$;
