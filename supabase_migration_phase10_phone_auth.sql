-- ============================================================
-- TechnoSys Phase 10 DB Migration: Phone Auth & SMS Announcements
-- Run this in the Supabase SQL Editor
-- ============================================================

-- STEP 1: Add phone_number to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;

-- Note: We retain the email column because Administrators will continue
-- to use Email/Password authentication. Technicians will transition to Phone/OTP.

-- STEP 2: Create an RPC function to assist with SMS announcements (Optional, for bulk retrieval)
CREATE OR REPLACE FUNCTION get_all_technician_phones()
RETURNS TABLE (phone_number TEXT, first_name TEXT, last_name TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT p.phone_number, p.first_name, p.last_name 
  FROM profiles p 
  WHERE p.role NOT IN ('admin', 'hr', 'ceo', 'coo', 'svp') -- Filter for field roles
  AND p.phone_number IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
