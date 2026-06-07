-- ============================================================
-- TechnoSys Unified Migration: Phase 9 - Attendance Tracking Mode
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Alter schedules table to add attendance_tracking_mode
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS attendance_tracking_mode VARCHAR(50) NOT NULL DEFAULT 'pacita_hq'
  CHECK (attendance_tracking_mode IN ('pacita_hq', 'direct_on_site', 'out_of_town'));
