-- ============================================================
-- TechnoSys Inventory Overhaul: Tool Tracking System Migration
-- Run this in the Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Ensure avatar_url column exists on profiles table (required for mobile avatars)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Clean up old ledger and procurement tables
DROP TABLE IF EXISTS public.procurement_orders CASCADE;
DROP TABLE IF EXISTS public.inventory_ledger CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.tool_assignments CASCADE;

-- 3. Create simplified inventory_items (Tools Database)
CREATE TABLE public.inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_qty INTEGER NOT NULL DEFAULT 1,
  available_qty INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create tool_assignments (Handover Ledger)
CREATE TABLE public.tool_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'lost', 'damaged')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Read access: All authenticated users can view tools and assignments
CREATE POLICY "Enable select for all authenticated users" 
  ON public.inventory_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable select for all authenticated assignments" 
  ON public.tool_assignments FOR SELECT TO authenticated USING (true);

-- Write access: Restrict inserts, updates, and deletes to coordinator, super_admin, and ceo
CREATE POLICY "Enable write access for authorized roles" 
  ON public.inventory_items FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role::text IN ('coordinator', 'super_admin', 'ceo')
    )
  );

CREATE POLICY "Enable write access for tool assignments" 
  ON public.tool_assignments FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role::text IN ('coordinator', 'super_admin', 'ceo')
    )
  );
