-- Create Push Notifications Queue
CREATE TABLE IF NOT EXISTS push_notifications_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Index for querying pending notifications
CREATE INDEX idx_push_notifications_pending ON push_notifications_queue(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE push_notifications_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view push queue" ON push_notifications_queue FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Trigger Function to add to push queue
CREATE OR REPLACE FUNCTION enqueue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
  v_body text;
  v_user_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'announcements' THEN
    -- Assuming announcements go to everyone or specific roles, this might need more logic
    -- For now, let's skip global announcements in this basic trigger or handle them via edge function directly
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'tickets' THEN
    -- Notify the admin or the user?
    -- Let's say we notify the user when ticket status changes
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_user_id := NEW.employee_id;
      v_title := 'Ticket Status Updated';
      v_body := 'Your ticket has been updated to ' || NEW.status;
      
      INSERT INTO push_notifications_queue (user_id, title, body, data)
      VALUES (v_user_id, v_title, v_body, jsonb_build_object('ticket_id', NEW.id));
    END IF;
  ELSIF TG_TABLE_NAME = 'leaves' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_user_id := NEW.technician_id;
      v_title := 'Leave Request Updated';
      v_body := 'Your leave request is now ' || NEW.status;
      
      INSERT INTO push_notifications_queue (user_id, title, body, data)
      VALUES (v_user_id, v_title, v_body, jsonb_build_object('leave_id', NEW.id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Triggers
DROP TRIGGER IF EXISTS trigger_enqueue_ticket_push ON tickets;
CREATE TRIGGER trigger_enqueue_ticket_push
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_push_notification();

DROP TRIGGER IF EXISTS trigger_enqueue_leave_push ON leaves;
CREATE TRIGGER trigger_enqueue_leave_push
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_push_notification();

-- Create pg_cron job to call Edge Function every minute
-- (Requires pg_cron and pg_net extensions)
-- SELECT cron.schedule('batch-push-notifications', '* * * * *', $$
--    SELECT net.http_post(
--        url:='https://[PROJECT_REF].supabase.co/functions/v1/batch_push_notifications',
--        headers:='{"Authorization": "Bearer [ANON_KEY]"}'::jsonb
--    );
-- $$);
