-- =============================================================
-- MIGRATION: OVERTIME REQUESTS DATABASE SCHEMA
-- =============================================================

CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,
  requested_hours NUMERIC(3, 2) NOT NULL CHECK (requested_hours > 0 AND requested_hours <= 24),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_tech_date_ot UNIQUE (technician_id, request_date)
);

-- Enable RLS
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;

-- Select policy: Technicians can view own, admins/coordinators can view all
DROP POLICY IF EXISTS "Enable select for authorized roles or own records" ON public.overtime_requests;
CREATE POLICY "Enable select for authorized roles or own records" 
ON public.overtime_requests FOR SELECT 
TO authenticated 
USING (
  auth.uid() = technician_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'coordinator', 'ceo', 'coo', 'hr', 'svp')
  )
);

-- Insert policy: Technicians can insert their own requests
DROP POLICY IF EXISTS "Enable insert for own records" ON public.overtime_requests;
CREATE POLICY "Enable insert for own records" 
ON public.overtime_requests FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = technician_id
);

-- Update policy: Reviewers can update status (admins/coordinators/hr)
DROP POLICY IF EXISTS "Enable update for reviews" ON public.overtime_requests;
CREATE POLICY "Enable update for reviews" 
ON public.overtime_requests FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'coordinator', 'ceo', 'coo', 'hr', 'svp')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'coordinator', 'ceo', 'coo', 'hr', 'svp')
  )
);

-- Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.overtime_requests;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
