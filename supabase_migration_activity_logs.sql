-- ============================================================
-- TechnoSys Unified Migration: Phase 8 - Activity Logs
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_name VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow access to admin roles
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;
CREATE POLICY "Admins can view activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'ceo', 'coo')
    )
  );

-- Insert policy: Allow authenticated system or user actions
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
