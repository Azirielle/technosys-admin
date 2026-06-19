-- ============================================================
-- TechnoSys Unified Migration: Phase 11 - Document Management System (DMS)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Leave Form', 'Resignation Form', 'Company Policy', 'Handbook', 'Other'
  file_url TEXT NOT NULL,
  file_size INT NOT NULL, -- in bytes
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.office_locations(id) ON DELETE SET NULL, -- NULL means global
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Anyone authenticated can view documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;

-- 4. Create policies for documents table
CREATE POLICY "Anyone authenticated can view documents" ON public.documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage documents" ON public.documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 5. Create storage bucket named 'documents'
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS policies for documents bucket
DROP POLICY IF EXISTS "Public Read Access on documents" ON storage.objects;
CREATE POLICY "Public Read Access on documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Admin Insert Access on documents" ON storage.objects;
CREATE POLICY "Admin Insert Access on documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  );

DROP POLICY IF EXISTS "Admin Delete Access on documents" ON storage.objects;
CREATE POLICY "Admin Delete Access on documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  );
