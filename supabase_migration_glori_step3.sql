-- ==========================================
-- STEP 3: LEAVE ATTACHMENTS & CHAT FILE SHARING
-- ==========================================

-- 1. Add attachment_url column to leaves table
ALTER TABLE public.leaves 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 2. Add attachment_url and attachment_type columns to ticket_comments table
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 3. Create leaves and chat-attachments storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('leaves', 'leaves', true),
  ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies for leaves storage objects
DROP POLICY IF EXISTS "Allow public select access to leaves" ON storage.objects;
CREATE POLICY "Allow public select access to leaves"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'leaves');

DROP POLICY IF EXISTS "Allow owners to write leaves" ON storage.objects;
CREATE POLICY "Allow owners to write leaves"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'leaves'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'leaves'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  );

-- 5. RLS policies for chat-attachments storage objects
DROP POLICY IF EXISTS "Allow public select access to chat-attachments" ON storage.objects;
CREATE POLICY "Allow public select access to chat-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Allow owners to write chat-attachments" ON storage.objects;
CREATE POLICY "Allow owners to write chat-attachments"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'chat-attachments'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  );
