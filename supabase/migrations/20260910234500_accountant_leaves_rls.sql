-- Migration: 20260910234500_accountant_leaves_rls.sql
-- Grant Accountants read access to public.leaves for payroll audit

DROP POLICY IF EXISTS "Accountants can view leaves for payroll audit" ON public.leaves;

CREATE POLICY "Accountants can view leaves for payroll audit"
ON public.leaves
FOR SELECT
TO authenticated
USING (
  (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = ANY (
    ARRAY['accountant'::user_role, 'hr'::user_role, 'ceo'::user_role, 'super_admin'::user_role]
  )
);
