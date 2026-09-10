-- Migration: 20260910180000_casual_helpers_register.sql
-- Description: Create casual_helpers catalog and schedule_casual_helpers junction table with RLS and indexes

-- 1. Create casual_helpers table
CREATE TABLE IF NOT EXISTS public.casual_helpers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 610.00,
    emergency_contact TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create schedule_casual_helpers junction table
CREATE TABLE IF NOT EXISTS public.schedule_casual_helpers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    casual_helper_id UUID NOT NULL REFERENCES public.casual_helpers(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(schedule_id, casual_helper_id)
);

-- 3. Indexes for high performance lookup
CREATE INDEX IF NOT EXISTS idx_casual_helpers_status ON public.casual_helpers(status);
CREATE INDEX IF NOT EXISTS idx_schedule_casual_helpers_schedule_id ON public.schedule_casual_helpers(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_casual_helpers_casual_helper_id ON public.schedule_casual_helpers(casual_helper_id);

-- 4. Enable RLS
ALTER TABLE public.casual_helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_casual_helpers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Allow authenticated read on casual_helpers" ON public.casual_helpers;
CREATE POLICY "Allow authenticated read on casual_helpers" 
ON public.casual_helpers FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage on casual_helpers" ON public.casual_helpers;
CREATE POLICY "Allow authenticated manage on casual_helpers" 
ON public.casual_helpers FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read on schedule_casual_helpers" ON public.schedule_casual_helpers;
CREATE POLICY "Allow authenticated read on schedule_casual_helpers" 
ON public.schedule_casual_helpers FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage on schedule_casual_helpers" ON public.schedule_casual_helpers;
CREATE POLICY "Allow authenticated manage on schedule_casual_helpers" 
ON public.schedule_casual_helpers FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
