-- Migration: Add status and clocked_out_by columns to time_logs table for collaborative shift closure
ALTER TABLE time_logs 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CONSTRAINT check_time_logs_status CHECK (status IN ('active', 'pending_close', 'closed'));

ALTER TABLE time_logs 
ADD COLUMN IF NOT EXISTS clocked_out_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Log the migration completion
COMMENT ON COLUMN time_logs.status IS 'The active state of the technician shift: active, pending_close, or closed';
COMMENT ON COLUMN time_logs.clocked_out_by IS 'The admin profile ID who manually clocked out the technician, if applicable';
