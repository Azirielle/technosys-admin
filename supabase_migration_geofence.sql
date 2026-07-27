-- ============================================================
-- TechnoSys Geofencing Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create office_locations table
-- Stores the GPS coordinates and allowed radius for each office.
-- An admin configures this from the admin panel.
CREATE TABLE IF NOT EXISTS office_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Main Office',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add GPS coordinate columns to time_logs
-- These record WHERE the employee clocked in from.
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_status TEXT DEFAULT 'unknown';
-- geofence_status: 'inside', 'outside_override', 'unknown'

-- 3. Add time_out column to time_logs (while we're at it)
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS app_time_out TIMESTAMPTZ;

-- 4. Insert a default office location (update with real coordinates later)
-- Using Manila, Philippines as a placeholder
INSERT INTO office_locations (name, latitude, longitude, radius_meters, is_active)
VALUES ('Main Office', 14.5995, 120.9842, 50, true);

-- ============================================================
-- VERIFICATION: Run these queries after to confirm it worked.
-- SELECT * FROM office_locations;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'time_logs';
-- ============================================================
