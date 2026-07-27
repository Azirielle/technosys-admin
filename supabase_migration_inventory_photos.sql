-- ============================================================
-- TechnoSys Unified Migration: Phase 10 - Inventory Photos & Bulk Import
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Alter inventory_items table to add image_url
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects on inventory-photos
-- Note: Drop policies if they already exist to avoid errors
DROP POLICY IF EXISTS "Public Read Access on inventory-photos" ON storage.objects;
CREATE POLICY "Public Read Access on inventory-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory-photos');

DROP POLICY IF EXISTS "Admin Insert Access on inventory-photos" ON storage.objects;
CREATE POLICY "Admin Insert Access on inventory-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inventory-photos' AND
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  );

DROP POLICY IF EXISTS "Admin Update Access on inventory-photos" ON storage.objects;
CREATE POLICY "Admin Update Access on inventory-photos"
  ON storage.objects FOR UPDATE
  WITH CHECK (
    bucket_id = 'inventory-photos' AND
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  );

DROP POLICY IF EXISTS "Admin Delete Access on inventory-photos" ON storage.objects;
CREATE POLICY "Admin Delete Access on inventory-photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inventory-photos' AND
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  );
