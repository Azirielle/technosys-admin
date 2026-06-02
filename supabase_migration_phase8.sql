-- ============================================================
-- TechnoSys Phase 8 DB Migration: Two-Factor Attendance,
-- Announcements, Holidays Calendar & Employee Lifecycle States
-- ============================================================

-- 1. Add Branch linkages and Lifecycle Status to employee profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES office_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'on_leave', 'terminated', 'archived'));

-- 2. Create physical_biometric_scans table
CREATE TABLE IF NOT EXISTS physical_biometric_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for scans
ALTER TABLE physical_biometric_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view biometric scans" ON physical_biometric_scans;
CREATE POLICY "Anyone authenticated can view biometric scans" ON physical_biometric_scans
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone authenticated can insert biometric scans" ON physical_biometric_scans;
CREATE POLICY "Anyone authenticated can insert biometric scans" ON physical_biometric_scans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_branch_id UUID REFERENCES office_locations(id) ON DELETE CASCADE, -- NULL means global
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view announcements" ON announcements;
CREATE POLICY "Anyone authenticated can view announcements" ON announcements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/Staff can manage announcements" ON announcements;
CREATE POLICY "Admins/Staff can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
    )
  );

-- 4. Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  holiday_date DATE UNIQUE NOT NULL,
  multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.30, -- e.g. 1.30 for 30% multiplier
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for holidays
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view holidays" ON holidays;
CREATE POLICY "Anyone authenticated can view holidays" ON holidays
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
CREATE POLICY "Admins can manage holidays" ON holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

-- 5. Seed some initial holidays for testing (Ph holidays in 2026)
INSERT INTO holidays (name, holiday_date, multiplier) VALUES 
  ('New Year Holiday', '2026-01-01', 2.00),
  ('Labor Day', '2026-05-01', 2.00),
  ('Independence Day', '2026-06-12', 2.00),
  ('Special Non-Working Holiday', '2026-08-21', 1.30)
ON CONFLICT (holiday_date) DO UPDATE SET multiplier = EXCLUDED.multiplier;

-- 6. RLS Override Policy for profiles table to allow supervisors to view profiles
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON profiles;
CREATE POLICY "Anyone authenticated can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
