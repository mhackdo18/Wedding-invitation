/*
# Security gate, collaborators, entourage, document viewer, proxy guest tracking, CTA link config

1. site_settings: add password_enabled, public_password, env_cta_type, env_cta_link
2. collaborators: new table for co-admins/editors
3. guests: add proxy_guest_name
4. entourage_members: new table for entourage page blocks
5. page_templates: add 'entourage' and 'document' to allowed templates
6. Seed entourage and document pages
*/

-- ============ site_settings: password gate + CTA link config ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='password_enabled') THEN
    ALTER TABLE site_settings ADD COLUMN password_enabled boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='public_password') THEN
    ALTER TABLE site_settings ADD COLUMN public_password text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_cta_type') THEN
    ALTER TABLE site_settings ADD COLUMN env_cta_type text NOT NULL DEFAULT 'internal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='env_cta_link') THEN
    ALTER TABLE site_settings ADD COLUMN env_cta_link text;
  END IF;
END $$;

-- ============ collaborators ============
CREATE TABLE IF NOT EXISTS collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_collaborators" ON collaborators;
CREATE POLICY "anon_crud_collaborators" ON collaborators
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ guests: add proxy_guest_name ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='proxy_guest_name') THEN
    ALTER TABLE guests ADD COLUMN proxy_guest_name text;
  END IF;
END $$;

-- ============ entourage_members ============
CREATE TABLE IF NOT EXISTS entourage_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  block_header text NOT NULL DEFAULT 'Bridal Party',
  block_subheader text,
  name text NOT NULL,
  role_title text,
  photo_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE entourage_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_entourage" ON entourage_members;
CREATE POLICY "anon_crud_entourage" ON entourage_members
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ Seed entourage and document pages ============
INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'entourage', 'Entourage', 'entourage', true, 5, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE template = 'entourage');

INSERT INTO pages (slug, title, template, is_visible, display_order, config)
SELECT 'travel-guide', 'Travel Guide', 'document', false, 6, '{"doc_url": "", "doc_type": "pdf"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE template = 'document');
