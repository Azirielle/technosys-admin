-- ============================================================
-- TechnoSys Chat Delivery and Read Receipts ("Seen" Status) Migration
-- ============================================================

-- 1. Add read_at column to ticket_comments table
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add performance index for quick unread receipt lookups
CREATE INDEX IF NOT EXISTS idx_comments_read_receipts 
ON ticket_comments(ticket_id, author_id) 
WHERE read_at IS NULL;

-- 3. Enable RLS UPDATE policy so both apps can update comment read statuses
DROP POLICY IF EXISTS "Users can update comments for accessible tickets" ON ticket_comments;
CREATE POLICY "Users can update comments for accessible tickets" ON ticket_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE id = ticket_comments.ticket_id AND (tickets.employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'admin')
      ))
    )
  );
