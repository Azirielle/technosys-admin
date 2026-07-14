-- ==========================================
-- STEP 4: PAYROLL DISPUTE SUBMISSION SYSTEM
-- ==========================================

-- 1. Create payroll_disputes table
CREATE TABLE IF NOT EXISTS public.payroll_disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_disputes ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for payroll_disputes
DROP POLICY IF EXISTS "Technicians can view own disputes" ON public.payroll_disputes;
CREATE POLICY "Technicians can view own disputes" ON public.payroll_disputes
  FOR SELECT USING (auth.uid() = technician_id);

DROP POLICY IF EXISTS "Technicians can insert own disputes" ON public.payroll_disputes;
CREATE POLICY "Technicians can insert own disputes" ON public.payroll_disputes
  FOR INSERT WITH CHECK (auth.uid() = technician_id);

DROP POLICY IF EXISTS "Staff can view all disputes" ON public.payroll_disputes;
CREATE POLICY "Staff can view all disputes" ON public.payroll_disputes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'ceo', 'accountant')
    )
  );

-- 4. Create payroll-disputes storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('payroll-disputes', 'payroll-disputes', true)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policies for payroll-disputes storage objects
DROP POLICY IF EXISTS "Allow public select access to payroll-disputes" ON storage.objects;
CREATE POLICY "Allow public select access to payroll-disputes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payroll-disputes');

DROP POLICY IF EXISTS "Allow owners to write payroll-disputes" ON storage.objects;
CREATE POLICY "Allow owners to write payroll-disputes"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'payroll-disputes'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'payroll-disputes'
    AND auth.role() = 'authenticated'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
  );
