-- 1. Create storage bucket named 'dtr-selfies' (PRIVATE bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dtr-selfies', 'dtr-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies for dtr-selfies bucket
-- Allow authenticated users to upload selfies
CREATE POLICY "Allow authenticated users to insert selfies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dtr-selfies' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own selfies (if needed)
CREATE POLICY "Allow authenticated users to update their selfies"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dtr-selfies' 
  AND owner = auth.uid()
);

-- Allow authenticated users (specifically admins and the owner) to read selfies
CREATE POLICY "Allow authenticated users to read selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dtr-selfies'
);

-- Note: Because this is a private bucket, the frontend will need to use
-- supabase.storage.from('dtr-selfies').createSignedUrl(path, expiresIn)
-- to actually display the images in <img src> tags.
