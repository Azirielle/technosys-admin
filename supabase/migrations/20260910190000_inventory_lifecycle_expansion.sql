-- Migration: 20260910190000_inventory_lifecycle_expansion.sql
-- Purpose: Support Full Tool Inventory Catalog & Loan/Return Lifecycle

-- 1. Expand tool_catalog
ALTER TABLE public.tool_catalog
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General Tools',
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_serialized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired'));

-- Populate sensible categories for existing seed items
UPDATE public.tool_catalog SET category = 'HVAC / Refrigeration' WHERE name ILIKE '%manifold%' OR name ILIKE '%vacuum pump%' OR name ILIKE '%refrigerant%';
UPDATE public.tool_catalog SET category = 'Diagnostics & Testing' WHERE name ILIKE '%multimeter%' OR name ILIKE '%clamp%';
UPDATE public.tool_catalog SET category = 'Hand Tools' WHERE name ILIKE '%flaring%';
UPDATE public.tool_catalog SET category = 'Power Tools' WHERE name ILIKE '%drill%' OR name ILIKE '%impact%' OR name ILIKE '%generator%';

-- 2. Expand tool_handovers
ALTER TABLE public.tool_handovers
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS condition_on_return text CHECK (condition_on_return IN ('good', 'minor_wear', 'damaged', 'lost')),
  ADD COLUMN IF NOT EXISTS condition_notes text,
  ADD COLUMN IF NOT EXISTS damage_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_by uuid REFERENCES public.profiles(id);

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_tool_handovers_technician_id ON public.tool_handovers(technician_id);
CREATE INDEX IF NOT EXISTS idx_tool_handovers_tool_id ON public.tool_handovers(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_handovers_status ON public.tool_handovers(status);
CREATE INDEX IF NOT EXISTS idx_tool_catalog_category ON public.tool_catalog(category);
