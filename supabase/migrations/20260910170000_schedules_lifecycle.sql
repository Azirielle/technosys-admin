-- Migration: Add lifecycle status, cancellation reason, and updated_at to public.schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN status text DEFAULT 'scheduled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN cancellation_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;
