-- Migration: Create public.payroll_cutoff_locks for period freezing
CREATE TABLE IF NOT EXISTS public.payroll_cutoff_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_locked boolean NOT NULL DEFAULT true,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_notes text,
  unlocked_at timestamptz,
  unlocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  unlock_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_cutoff_locks_dates 
  ON public.payroll_cutoff_locks (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payroll_cutoff_locks_period 
  ON public.payroll_cutoff_locks (period_id);

ALTER TABLE public.payroll_cutoff_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view payroll cutoff locks" ON public.payroll_cutoff_locks;
CREATE POLICY "Authenticated staff can view payroll cutoff locks"
  ON public.payroll_cutoff_locks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Accountant, CEO, Super Admin can manage payroll cutoff locks" ON public.payroll_cutoff_locks;
CREATE POLICY "Accountant, CEO, Super Admin can manage payroll cutoff locks"
  ON public.payroll_cutoff_locks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('accountant', 'ceo', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('accountant', 'ceo', 'super_admin')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payroll_cutoff_locks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_cutoff_locks;
  END IF;
END $$;
