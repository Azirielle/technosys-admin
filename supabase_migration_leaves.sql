-- ============================================================
-- TechnoSys Leaves Management Database Migration (Phase 5)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'vacation', 'emergency', 'unpaid')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Validate end date is on or after start date
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for technicians (field employees)
DROP POLICY IF EXISTS "Technicians can view own leaves" ON leaves;
CREATE POLICY "Technicians can view own leaves" ON leaves
  FOR SELECT USING (auth.uid() = technician_id);

DROP POLICY IF EXISTS "Technicians can insert own leaves" ON leaves;
CREATE POLICY "Technicians can insert own leaves" ON leaves
  FOR INSERT WITH CHECK (auth.uid() = technician_id);

DROP POLICY IF EXISTS "Technicians can update own pending leaves" ON leaves;
CREATE POLICY "Technicians can update own pending leaves" ON leaves
  FOR UPDATE USING (auth.uid() = technician_id AND status = 'pending');

-- 4. RLS Policies for admins and super_admins
DROP POLICY IF EXISTS "Admins can manage all leaves" ON leaves;
CREATE POLICY "Admins can manage all leaves" ON leaves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

-- 5. Enable Realtime updates for leaves table
ALTER PUBLICATION supabase_realtime ADD TABLE leaves;
