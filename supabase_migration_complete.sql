-- ============================================================
-- TechnoSys Complete Unified Migration: Phases 1 to 3
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ------------------------------------------------------------
-- PART 1: Geofencing Migration
-- ------------------------------------------------------------

-- 1. Create office_locations table
CREATE TABLE IF NOT EXISTS office_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Main Office',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add GPS coordinate columns to time_logs
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_status TEXT DEFAULT 'unknown';
-- geofence_status: 'inside', 'outside_override', 'unknown'

-- 3. Add time_out column to time_logs
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS app_time_out TIMESTAMPTZ;

-- 4. Insert default office location (Manila, Philippines)
INSERT INTO office_locations (name, latitude, longitude, radius_meters, is_active)
VALUES ('Main Office', 14.5995, 120.9842, 50, true)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- PART 2: Service Ticketing Migration
-- ------------------------------------------------------------

-- 1. Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Leave Request', 'Payroll Dispute', 'Benefits Inquiry', 'Equipment Issue', 'Other'
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'assigned', 'in_progress', 'resolved', 'closed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create ticket_comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for tickets
DROP POLICY IF EXISTS "Employees can view own tickets" ON tickets;
CREATE POLICY "Employees can view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Employees can create own tickets" ON tickets;
CREATE POLICY "Employees can create own tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Employees can update own tickets" ON tickets;
CREATE POLICY "Employees can update own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Admins/Staff can manage all tickets" ON tickets;
CREATE POLICY "Admins/Staff can manage all tickets" ON tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin')
    )
  );

-- 5. RLS Policies for ticket_comments
DROP POLICY IF EXISTS "Users can view comments for accessible tickets" ON ticket_comments;
CREATE POLICY "Users can view comments for accessible tickets" ON ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE id = ticket_comments.ticket_id AND (tickets.employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'admin')
      ))
    )
  );

DROP POLICY IF EXISTS "Users can create comments for accessible tickets" ON ticket_comments;
CREATE POLICY "Users can create comments for accessible tickets" ON ticket_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE id = ticket_comments.ticket_id AND (tickets.employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'admin')
      ))
    )
  );


-- ------------------------------------------------------------
-- PART 3: HR, Multi-Office Geofence & Inventory Control (Phase 3)
-- ------------------------------------------------------------

-- 1. Complete HR: Add total_hours to time_logs
ALTER TABLE time_logs
  ADD COLUMN IF NOT EXISTS total_hours NUMERIC;

-- 2. Generalize Geofences: Insert a second location (QC Branch) for testing
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
