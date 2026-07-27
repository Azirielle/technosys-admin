-- ============================================================
-- TechnoSys Unified Migration: Phase 3
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Complete HR: Add total_hours to time_logs
-- Calculates elapsed duration between clock-in and clock-out.
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS total_hours NUMERIC;

-- 2. Generalize Geofences: Verify office_locations table
-- The table structure office_locations is already capable of multiple records.
-- No schema changes needed, but let's insert a second location for testing.
INSERT INTO office_locations (name, latitude, longitude, radius_meters, is_active)
VALUES ('Quezon City Branch', 14.6760, 121.0437, 100, true)
ON CONFLICT DO NOTHING;

-- 3. Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create stock_transactions table (ledger)
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')), -- 'in' = Restock, 'out' = Consumed
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) on inventory tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for inventory_items
DROP POLICY IF EXISTS "Anyone authenticated can view inventory" ON inventory_items;
CREATE POLICY "Anyone authenticated can view inventory" ON inventory_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory_items;
CREATE POLICY "Admins can manage inventory" ON inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );

-- 7. RLS Policies for stock_transactions
DROP POLICY IF EXISTS "Technicians can insert transactions" ON stock_transactions;
CREATE POLICY "Technicians can insert transactions" ON stock_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = technician_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Technicians can view own transactions" ON stock_transactions;
CREATE POLICY "Technicians can view own transactions" ON stock_transactions
  FOR SELECT USING (
    auth.uid() = technician_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage all transactions" ON stock_transactions;
CREATE POLICY "Admins can manage all transactions" ON stock_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );
