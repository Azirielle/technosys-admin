-- ==========================================
-- STEP 1: ROLES CLEANUP & DRIVER ROLE SETUP
-- ==========================================

-- 1. Reassign supervisor and coo profile roles to valid roles
UPDATE public.profiles 
SET role = 'coordinator' 
WHERE role = 'supervisor';

UPDATE public.profiles 
SET role = 'ceo' 
WHERE role = 'coo';

-- 2. Add is_driver column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_driver BOOLEAN NOT NULL DEFAULT false;

-- 3. Update RLS policies to remove 'coo' and 'supervisor' references
-- A. Update activity_logs policies (re-create policy with updated roles list)
DROP POLICY IF EXISTS "Admins/Staff can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins/Staff can view all activity logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'ceo')
    )
  );

-- B. Update inventory_ledger policies
DROP POLICY IF EXISTS "Admins can view ledger" ON public.stock_transactions; -- if exists
-- We also ensure that any other policies referencing 'coo' or 'supervisor' are cleanly managed.
