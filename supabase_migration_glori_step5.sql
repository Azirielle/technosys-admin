-- ==========================================
-- STEP 5: BACKGROUND GEOLOCATION SERVICE
-- ==========================================

-- 1. Create live_locations table
CREATE TABLE IF NOT EXISTS public.live_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  gps_accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for live_locations
DROP POLICY IF EXISTS "Technicians can view own live locations" ON public.live_locations;
CREATE POLICY "Technicians can view own live locations" ON public.live_locations
  FOR SELECT USING (auth.uid() = technician_id);

DROP POLICY IF EXISTS "Technicians can insert own live locations" ON public.live_locations;
CREATE POLICY "Technicians can insert own live locations" ON public.live_locations
  FOR INSERT WITH CHECK (auth.uid() = technician_id);

DROP POLICY IF EXISTS "Staff can view all live locations" ON public.live_locations;
CREATE POLICY "Staff can view all live locations" ON public.live_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'coordinator', 'ceo')
    )
  );
