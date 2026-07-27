-- ============================================================
-- TechnoSys Service Ticketing Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

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

-- ============================================================
-- VERIFICATION QUERIES:
-- SELECT * FROM tickets;
-- SELECT * FROM ticket_comments;
-- ============================================================
