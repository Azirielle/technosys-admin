-- Add review metadata to time_logs table
ALTER TABLE public.time_logs 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Drop and recreate the view if necessary, or just rely on the new columns.
-- We also want an index to speed up history queries
CREATE INDEX IF NOT EXISTS idx_time_logs_photo_status ON public.time_logs(photo_status);
CREATE INDEX IF NOT EXISTS idx_time_logs_reviewed_at ON public.time_logs(reviewed_at);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
