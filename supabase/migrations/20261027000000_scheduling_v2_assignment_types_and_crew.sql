-- Migration: 20261027000000_scheduling_v2_assignment_types_and_crew.sql
-- Description: Adds assignment types, crew assignments join table, change history logs, and Pacita HQ auto-geofencing

-- 1. Extend public.schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN assignment_type TEXT DEFAULT 'on_site' CHECK (assignment_type IN ('on_site', 'deployment', 'office_duty'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'project_name'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN project_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'target_review_date'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN target_review_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'reporting_instruction'
  ) THEN
    ALTER TABLE public.schedules 
      ADD COLUMN reporting_instruction TEXT DEFAULT 'direct_to_site' CHECK (reporting_instruction IN ('direct_to_site', 'via_pacita_hq'));
  END IF;
END $$;

-- 2. Trigger function to auto-lock Pacita HQ geofence for office duty
CREATE OR REPLACE FUNCTION public.handle_office_duty_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_type = 'office_duty' THEN
    IF NEW.geofence_lat IS NULL OR NEW.geofence_lat = 0 THEN
      NEW.geofence_lat := 14.3529;
    END IF;
    IF NEW.geofence_lon IS NULL OR NEW.geofence_lon = 0 THEN
      NEW.geofence_lon := 121.0568;
    END IF;
    IF NEW.geofence_radius IS NULL OR NEW.geofence_radius = 0 THEN
      NEW.geofence_radius := 200;
    END IF;
    IF NEW.location IS NULL OR trim(NEW.location) = '' THEN
      NEW.location := 'Pacita HQ, San Pedro, Laguna';
    END IF;
    IF NEW.client_name IS NULL OR trim(NEW.client_name) = '' THEN
      NEW.client_name := 'TechnoCycle Main Office';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_office_duty_defaults ON public.schedules;
CREATE TRIGGER trg_office_duty_defaults
BEFORE INSERT OR UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_office_duty_defaults();

-- 3. Create schedule_crew_assignments
CREATE TABLE IF NOT EXISTS public.schedule_crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_role TEXT NOT NULL DEFAULT 'crew' CHECK (assignment_role IN ('lead', 'crew', 'driver', 'helper')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'reassigned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_release_after_joined CHECK (released_at IS NULL OR released_at >= joined_at),
  CONSTRAINT uq_schedule_technician UNIQUE (schedule_id, technician_id)
);

-- Indexes for schedule_crew_assignments
CREATE INDEX IF NOT EXISTS idx_crew_assignments_schedule_id ON public.schedule_crew_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_technician_id ON public.schedule_crew_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_status ON public.schedule_crew_assignments(status);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_joined_at ON public.schedule_crew_assignments(joined_at);

-- RLS for schedule_crew_assignments
ALTER TABLE public.schedule_crew_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read crew assignments" ON public.schedule_crew_assignments;
CREATE POLICY "Allow authenticated read crew assignments"
  ON public.schedule_crew_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert crew assignments" ON public.schedule_crew_assignments;
CREATE POLICY "Allow authenticated insert crew assignments"
  ON public.schedule_crew_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update crew assignments" ON public.schedule_crew_assignments;
CREATE POLICY "Allow authenticated update crew assignments"
  ON public.schedule_crew_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete crew assignments" ON public.schedule_crew_assignments;
CREATE POLICY "Allow authenticated delete crew assignments"
  ON public.schedule_crew_assignments FOR DELETE
  TO authenticated
  USING (true);

-- 4. Create schedule_change_logs
CREATE TABLE IF NOT EXISTS public.schedule_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'rescheduled', 'reassigned', 'crew_added', 'crew_released', 'cancelled', 'details_updated')),
  previous_payload JSONB,
  new_payload JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for schedule_change_logs
CREATE INDEX IF NOT EXISTS idx_change_logs_schedule_id ON public.schedule_change_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON public.schedule_change_logs(created_at);

-- RLS for schedule_change_logs
ALTER TABLE public.schedule_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read change logs" ON public.schedule_change_logs;
CREATE POLICY "Allow authenticated read change logs"
  ON public.schedule_change_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert change logs" ON public.schedule_change_logs;
CREATE POLICY "Allow authenticated insert change logs"
  ON public.schedule_change_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Backfill existing schedules into schedule_crew_assignments
INSERT INTO public.schedule_crew_assignments (schedule_id, technician_id, assignment_role, joined_at, status)
SELECT 
  s.id, 
  s.technician_id, 
  'lead' as assignment_role, 
  COALESCE(s.start_time, now()) as joined_at, 
  'active' as status
FROM public.schedules s
WHERE s.technician_id IS NOT NULL
ON CONFLICT (schedule_id, technician_id) DO NOTHING;

-- Also backfill senior_partner_id if present and different from technician_id
INSERT INTO public.schedule_crew_assignments (schedule_id, technician_id, assignment_role, joined_at, status)
SELECT 
  s.id, 
  s.senior_partner_id, 
  'crew' as assignment_role, 
  COALESCE(s.start_time, now()) as joined_at, 
  'active' as status
FROM public.schedules s
WHERE s.senior_partner_id IS NOT NULL AND s.senior_partner_id != s.technician_id
ON CONFLICT (schedule_id, technician_id) DO NOTHING;
