-- Migration: Create public.time_log_corrections for auditable DTR corrections
CREATE TABLE IF NOT EXISTS public.time_log_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_log_id uuid REFERENCES public.time_logs(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_date date NOT NULL,
  correction_type text NOT NULL CHECK (correction_type IN ('update_punch', 'insert_missing_shift', 'excuse_absence')),
  original_time_in timestamptz,
  original_time_out timestamptz,
  corrected_time_in timestamptz NOT NULL,
  corrected_time_out timestamptz NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 10),
  corrected_by uuid NOT NULL REFERENCES public.profiles(id),
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_log_corrections_tech_date 
  ON public.time_log_corrections (technician_id, target_date);

CREATE INDEX IF NOT EXISTS idx_time_log_corrections_time_log 
  ON public.time_log_corrections (time_log_id);

ALTER TABLE public.time_log_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view time log corrections" ON public.time_log_corrections;
CREATE POLICY "Authenticated staff can view time log corrections"
  ON public.time_log_corrections
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Accountant, HR, CEO can insert corrections" ON public.time_log_corrections;
CREATE POLICY "Accountant, HR, CEO can insert corrections"
  ON public.time_log_corrections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('accountant', 'hr', 'ceo', 'super_admin')
    )
  );
