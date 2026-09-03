/*
# Create backup_snapshots table

1. New Tables
- `backup_snapshots` — stores full snapshots of all site settings + pages for backup/restore
  - `id` (uuid, primary key)
  - `label` (text, user-given name for the snapshot)
  - `settings_json` (jsonb, complete row from site_settings at backup time)
  - `pages_json` (jsonb, complete rows from pages at backup time)
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `backup_snapshots`.
- 4 policies for anon, authenticated CRUD (single-tenant admin app, no separate auth screen — the admin panel uses the anon key).
*/

CREATE TABLE IF NOT EXISTS backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Backup',
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pages_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backup_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_snapshots" ON backup_snapshots;
CREATE POLICY "anon_select_snapshots" ON backup_snapshots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_snapshots" ON backup_snapshots;
CREATE POLICY "anon_insert_snapshots" ON backup_snapshots FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_snapshots" ON backup_snapshots;
CREATE POLICY "anon_update_snapshots" ON backup_snapshots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_snapshots" ON backup_snapshots;
CREATE POLICY "anon_delete_snapshots" ON backup_snapshots FOR DELETE
  TO anon, authenticated USING (true);
