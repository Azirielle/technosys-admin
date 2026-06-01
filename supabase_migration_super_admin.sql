-- ============================================================
-- TechnoSys Super Admin & RLS Policies Migration
-- IMPORTANT: Run this migration in two separate steps!
-- Postgres requires enum additions to be committed before they can be referenced.
-- ============================================================

-- ============================================================
-- STEP 1: Run ONLY this block first, then click "Run" in Supabase
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- ============================================================
-- STEP 2: Clear the editor, paste and run the REST of the script below
-- ============================================================

-- 2. Update RLS policies for tickets
DROP POLICY IF EXISTS "Admins/Staff can manage all tickets" ON tickets;
CREATE POLICY "Admins/Staff can manage all tickets" ON tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Users can view comments for accessible tickets" ON ticket_comments;
CREATE POLICY "Users can view comments for accessible tickets" ON ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE id = ticket_comments.ticket_id AND (tickets.employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
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
        WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
      ))
    )
  );

-- 3. Update RLS policies for inventory_items
DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory_items;
CREATE POLICY "Admins can manage inventory" ON inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

-- 4. Update RLS policies for stock_transactions
DROP POLICY IF EXISTS "Technicians can insert transactions" ON stock_transactions;
CREATE POLICY "Technicians can insert transactions" ON stock_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = technician_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Technicians can view own transactions" ON stock_transactions;
CREATE POLICY "Technicians can view own transactions" ON stock_transactions
  FOR SELECT USING (
    auth.uid() = technician_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Admins can manage all transactions" ON stock_transactions;
CREATE POLICY "Admins can manage all transactions" ON stock_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

-- 5. Update RLS policies for inventory_audits (Phase 4)
DROP POLICY IF EXISTS "Admins can manage audits" ON inventory_audits;
CREATE POLICY "Admins can manage audits" ON inventory_audits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "Admins can manage audit items" ON inventory_audit_items;
CREATE POLICY "Admins can manage audit items" ON inventory_audit_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role IN ('admin', 'super_admin'))
    )
  );

-- 6. Promote technosis@admin.com user profile to super_admin role
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'a8a1f2dc-31be-4b8e-ba4f-f55a245e24bc';
