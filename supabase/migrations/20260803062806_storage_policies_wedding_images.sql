/*
# Storage policies for wedding-images bucket

Allow anon+authenticated to upload, read, and delete images in the public wedding-images bucket.
Single-tenant app — all images are intentionally public.
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "anon_read_wedding_images" ON storage.objects;
DROP POLICY IF EXISTS "anon_write_wedding_images" ON storage.objects;

-- Allow public read
CREATE POLICY "anon_read_wedding_images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'wedding-images');

-- Allow public insert/update/delete
CREATE POLICY "anon_write_wedding_images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'wedding-images');

DROP POLICY IF EXISTS "anon_update_wedding_images" ON storage.objects;
CREATE POLICY "anon_update_wedding_images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'wedding-images') WITH CHECK (bucket_id = 'wedding-images');

DROP POLICY IF EXISTS "anon_delete_wedding_images" ON storage.objects;
CREATE POLICY "anon_delete_wedding_images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'wedding-images');
