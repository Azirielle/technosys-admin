-- ============================================================
-- TechnoSys Unified Migration: Phase 4
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. GPS Integrity & Spoofing Detection
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS is_mocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION;

-- 2. Create inventory_audits table
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  auditor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT
);

-- 3. Create inventory_audit_items table
CREATE TABLE IF NOT EXISTS inventory_audit_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  system_quantity INTEGER NOT NULL,
  physical_quantity INTEGER NOT NULL,
  variance INTEGER NOT NULL
);

-- 4. Enable Row Level Security (RLS) on audit tables
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for inventory_audits
DROP POLICY IF EXISTS "Admins can manage audits" ON inventory_audits;
CREATE POLICY "Admins can manage audits" ON inventory_audits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );

-- 6. RLS Policies for inventory_audit_items
DROP POLICY IF EXISTS "Admins can manage audit items" ON inventory_audit_items;
CREATE POLICY "Admins can manage audit items" ON inventory_audit_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );
