-- 1. Add is_archived to the 4 main tables
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Create system_audit_logs table
CREATE TABLE public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    user_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create deletion_requests table
CREATE TABLE public.deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'archived', 'deleted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Enable RLS on new tables
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for system_audit_logs
CREATE POLICY "Admins can view audit logs"
ON public.system_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'ceo', 'hr', 'coordinator', 'branch_manager')
  )
);

CREATE POLICY "Admins can insert audit logs"
ON public.system_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'ceo', 'hr', 'coordinator', 'branch_manager', 'accountant')
  )
);

-- 6. RLS Policies for deletion_requests
CREATE POLICY "Admins can view deletion requests"
ON public.deletion_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'ceo', 'hr', 'coordinator', 'branch_manager', 'accountant')
  )
);

CREATE POLICY "Admins can insert deletion requests"
ON public.deletion_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'ceo', 'hr', 'coordinator', 'branch_manager', 'accountant')
  )
);

CREATE POLICY "Only CEO and Super Admin can update deletion requests"
ON public.deletion_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'ceo')
  )
);
