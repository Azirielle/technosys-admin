-- ============================================================
-- TechnoSys DTR Selfie Approval & Automatic Geocoding Migration
-- Run this in the Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Add Selfie Photo Columns to time_logs table
ALTER TABLE public.time_logs 
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_status TEXT DEFAULT 'pending' CHECK (photo_status IN ('pending', 'approved', 'rejected'));

-- 2. Add Geofencing Columns to schedules table
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS geofence_lat FLOAT,
  ADD COLUMN IF NOT EXISTS geofence_lon FLOAT,
  ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 500;

-- 3. (Optional) Backfill any existing schedules with a generous default if they happen to need one, 
-- but leaving them as NULL acts as our bypass (geofence disabled), which is perfect.
