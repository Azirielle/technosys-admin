-- ============================================================
-- TechnoSys Phase 9 DB Migration: DTR Attendance Modes,
-- Senior-Partner Linkages, Unique Locations, and Activity Logs
-- ============================================================

-- 1. Clean up duplicate office locations keeping the oldest entry for each name
DELETE FROM office_locations
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM office_locations
  ORDER BY name, created_at ASC
);

-- 2. Add Unique Name constraint on office_locations
ALTER TABLE office_locations 
  ADD CONSTRAINT unique_office_location_name UNIQUE (name);

-- 2. Update schedules table to support direct dispatch/out-of-town modes
-- and link helpers to senior partners
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS attendance_mode TEXT NOT NULL DEFAULT 'hq' CHECK (attendance_mode IN ('hq', 'direct_dispatch', 'out_of_town')),
  ADD COLUMN IF NOT EXISTS senior_partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ALTER COLUMN end_time DROP NOT NULL;

-- 3. Create activity_logs table for administrative audit trails
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- e.g. 'register_employee', 'approve_leave'
  target_category TEXT NOT NULL, -- e.g. 'employee', 'schedule', 'leave'
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Staff can view all activity logs" ON activity_logs;
CREATE POLICY "Admins/Staff can view all activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
    )
  );

DROP POLICY IF EXISTS "Technicians/Helpers can view their own activity logs" ON activity_logs;
CREATE POLICY "Technicians/Helpers can view their own activity logs" ON activity_logs
  FOR SELECT USING (actor_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Create dtr_override_logs table for manual overrides audit trail
CREATE TABLE IF NOT EXISTS dtr_override_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modifier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_id UUID REFERENCES time_logs(id) ON DELETE SET NULL,
  original_time_in TIMESTAMPTZ,
  original_time_out TIMESTAMPTZ,
  new_time_in TIMESTAMPTZ,
  new_time_out TIMESTAMPTZ,
  justification TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for dtr_override_logs
ALTER TABLE dtr_override_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/Staff can view all DTR override logs" ON dtr_override_logs;
CREATE POLICY "Admins/Staff can view all DTR override logs" ON dtr_override_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
    )
  );

DROP POLICY IF EXISTS "Technicians/Helpers can view their own DTR override logs" ON dtr_override_logs;
CREATE POLICY "Technicians/Helpers can view their own DTR override logs" ON dtr_override_logs
  FOR SELECT USING (target_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert DTR override logs" ON dtr_override_logs;
CREATE POLICY "Authenticated users can insert DTR override logs" ON dtr_override_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

