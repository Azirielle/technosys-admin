-- ============================================================
-- TechnoSys Phase 7 DB Migration: Org Chart, Expanded Leaves,
-- 201 Compliance Checklist & RBAC RLS Adjustments
-- ============================================================

-- STEP 1: Add new values to user_role type (run individually first in Supabase if needed)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'svp';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branch_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'helper';

-- STEP 2: Alter Profiles and Leaves
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hire_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'ojt' CHECK (employment_status IN ('ojt', 'contractual', 'provisionary', 'regular'));

-- 201 File Compliance Checklist Flags
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_sss_id BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_philhealth_id BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_pagibig_id BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_nbi_clearance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_resume BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_medical_clearance BOOLEAN NOT NULL DEFAULT false;

-- Update leaves classifications constraint
ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_leave_type_check;
ALTER TABLE leaves ADD CONSTRAINT leaves_leave_type_check CHECK (leave_type IN ('sick', 'vacation', 'wedding', 'paternal', 'maternal', 'emergency', 'unpaid'));

-- Alter time_logs table to support supervisor DTR manual entries
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN NOT NULL DEFAULT false;

-- STEP 3: RLS Policy Updates to support expanded office roles
-- Update RLS policies for tickets (all non-technician and non-helper office staff can manage)
DROP POLICY IF EXISTS "Admins/Staff can manage all tickets" ON tickets;
CREATE POLICY "Admins/Staff can manage all tickets" ON tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
    )
  );

-- Update RLS policies for ticket_comments
DROP POLICY IF EXISTS "Users can view comments for accessible tickets" ON ticket_comments;
CREATE POLICY "Users can view comments for accessible tickets" ON ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE id = ticket_comments.ticket_id AND (tickets.employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
      ))
    )
  );

DROP POLICY IF EXISTS "Users can create comments for accessible tickets" ON ticket_comments;
CREATE POLICY "Users can create comments for accessible tickets" ON ticket_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE id = ticket_comments.ticket_id AND (tickets.employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
      ))
    )
  );

-- Update RLS policies for leaves (HR, CEO, COO, and generic admin/super_admin can manage)
DROP POLICY IF EXISTS "Admins can manage all leaves" ON leaves;
CREATE POLICY "Admins can manage all leaves" ON leaves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('hr', 'ceo', 'coo', 'admin', 'super_admin'))
    )
  );

-- Update RLS policies for inventory_items (all office personnel manage inventory items)
DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory_items;
CREATE POLICY "Admins can manage inventory" ON inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
    )
  );

-- Update RLS policies for stock_transactions
DROP POLICY IF EXISTS "Admins can manage all transactions" ON stock_transactions;
CREATE POLICY "Admins can manage all transactions" ON stock_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role NOT IN ('technician', 'helper'))
    )
  );
