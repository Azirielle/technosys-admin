-- Migration: 20260910235900_persistent_system_overrides.sql
-- Persistent CEO System Overrides with Realtime Synchronization

CREATE TABLE IF NOT EXISTS public.system_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL, -- 'accountant' | 'coordinator' | 'hr'
  granted_modules TEXT[] NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial records if not present
INSERT INTO public.system_overrides (role_key, granted_modules)
VALUES 
  ('accountant', '{}'),
  ('coordinator', '{}'),
  ('hr', '{}')
ON CONFLICT (role_key) DO NOTHING;

-- Enable Supabase Realtime replication on system_overrides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'system_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_overrides;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.system_overrides ENABLE ROW LEVEL SECURITY;

-- Read policy: All authenticated users can view system overrides (needed for Sidebar rendering)
DROP POLICY IF EXISTS "Allow authenticated read on system_overrides" ON public.system_overrides;
CREATE POLICY "Allow authenticated read on system_overrides"
ON public.system_overrides
FOR SELECT
TO authenticated
USING (true);

-- Mutation policy: Strictly CEO and Super Admin can insert or update overrides
DROP POLICY IF EXISTS "Allow CEO and Super Admin to modify system_overrides" ON public.system_overrides;
CREATE POLICY "Allow CEO and Super Admin to modify system_overrides"
ON public.system_overrides
FOR ALL
TO authenticated
USING (
  (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (
    ARRAY['ceo'::user_role, 'super_admin'::user_role]
  )
)
WITH CHECK (
  (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (
    ARRAY['ceo'::user_role, 'super_admin'::user_role]
  )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access on system_overrides" ON public.system_overrides;
CREATE POLICY "Service role full access on system_overrides"
ON public.system_overrides
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
