-- ============================================================
-- TechnoSys Phase 9 Push Notification Database Migration
-- ============================================================

-- Add push_token column to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS push_token TEXT;
