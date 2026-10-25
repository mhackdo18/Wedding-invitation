/*
# Add page-level guest tags (visibility)

## Summary
Adds a `visible_tags` column to the `pages` table so individual pages can be
shown only to guests with matching tags. An empty array (the default) means
the page is shown to everyone, preserving existing behavior.

This mirrors the existing per-block `tags` visibility used by the Information
page template (stored in the `pages.config` JSON), but at the page level so
any page template (Schedule, Gallery, Story, etc.) can be gated to specific
guest groups.

## Modified Tables
- `pages`
  - `visible_tags` (text[], NOT NULL, DEFAULT '{}') — list of guest tag
    labels. When empty, the page is visible to everyone. When non-empty,
    the page is only shown on invitation links whose guest has at least one
    of these tags; it is hidden on the public site (no guest context).

## Security
- RLS already enabled on `pages` (admin-managed, anon+authenticated CRUD).
- No policy changes needed — existing policies already allow full CRUD for
  `anon, authenticated`, which is the established pattern for this single-tenant
  admin-managed table.

## Notes
1. Tags are referenced by name (consistent with `guests.tags`,
   `rsvp_questions.guest_tags`, and the Information block `tags` JSON).
2. The `tags` registry table already exists for the tag autocomplete UI.
3. The frontend filters: empty `visible_tags` → visible to all; non-empty →
   visible only where the guest's `tags` intersect `visible_tags`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'visible_tags'
  ) THEN
    ALTER TABLE pages ADD COLUMN visible_tags text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
