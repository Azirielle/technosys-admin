-- ==========================================
-- STEP 2: PROFILE AVATAR PHOTO UPLOADS
-- ==========================================

-- 1. Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create the avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for avatars storage objects
DROP POLICY IF EXISTS "Allow public select access to avatars" ON storage.objects;
CREATE POLICY "Allow public select access to avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow owners to write avatars" ON storage.objects;
CREATE POLICY "Allow owners to write avatars"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  );
