-- ============================================================
-- TechnoSys Inventory & Procurement Ledger System Migration
-- Run this in the Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Create or verify inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  image_url TEXT
);

-- 2. Create inventory_ledger table
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty_change INTEGER NOT NULL, -- positive for IN (qty added), negative for OUT (qty deducted)
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  balance INTEGER NOT NULL, -- running stock balance after this transaction
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create procurement_orders table
CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL UNIQUE,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qty INTEGER NOT NULL CHECK (qty > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')),
  delivered_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;

-- Create basic RLS Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_items;
CREATE POLICY "Enable read access for all users" ON public.inventory_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable write access for admins" ON public.inventory_items;
CREATE POLICY "Enable write access for admins" ON public.inventory_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'ceo', 'coo'))
);

DROP POLICY IF EXISTS "Enable read access for ledger" ON public.inventory_ledger;
CREATE POLICY "Enable read access for ledger" ON public.inventory_ledger FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for ledger" ON public.inventory_ledger;
CREATE POLICY "Enable insert for ledger" ON public.inventory_ledger FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for procurement" ON public.procurement_orders;
CREATE POLICY "Enable read access for procurement" ON public.procurement_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable write access for procurement" ON public.procurement_orders;
CREATE POLICY "Enable write access for procurement" ON public.procurement_orders FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'ceo', 'coo', 'accountant'))
);
