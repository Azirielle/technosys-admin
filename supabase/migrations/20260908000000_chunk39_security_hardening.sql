-- ==============================================================================
-- CHUNK 39: DATABASE SECURITY HARDENING, RPC ACCESS LOCKDOWN & RLS GOVERNANCE
-- ==============================================================================

-- 1. Function Search Path Pinning & Security Invoker Conversion
-- Downgrade get_server_time to SECURITY INVOKER and pin search_path
ALTER FUNCTION public.get_server_time() SECURITY INVOKER;
ALTER FUNCTION public.get_server_time() SET search_path = public, pg_temp;

-- Pin search_path on internal and exposed functions to prevent path manipulation
ALTER FUNCTION public.get_email_from_contact(text) SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.handle_low_stock_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_duplicate_clockins() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_technician_locations() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_push_notification() SET search_path = public, net, pg_temp;
ALTER FUNCTION public.match_documents(vector, double precision, integer, jsonb) SET search_path = public, pg_temp;

-- 2. Revoke Public / Anon / Authenticated Execution from Internal Triggers
REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_technician_locations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_low_stock_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_clockins() FROM PUBLIC, anon, authenticated;

-- Revoke PostGIS C internal functions exposed to anon/authenticated
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC, anon, authenticated;

-- 3. Enable RLS on Statutory Tables
ALTER TABLE IF EXISTS public.philhealth_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pagibig_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sss_brackets ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Statutory Tables
-- PhilHealth
DROP POLICY IF EXISTS "Authenticated users can read philhealth_rules" ON public.philhealth_rules;
CREATE POLICY "Authenticated users can read philhealth_rules"
  ON public.philhealth_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage philhealth_rules" ON public.philhealth_rules;
CREATE POLICY "Admins can manage philhealth_rules"
  ON public.philhealth_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'accountant')
    )
  );

-- Pag-IBIG
DROP POLICY IF EXISTS "Authenticated users can read pagibig_brackets" ON public.pagibig_brackets;
CREATE POLICY "Authenticated users can read pagibig_brackets"
  ON public.pagibig_brackets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage pagibig_brackets" ON public.pagibig_brackets;
CREATE POLICY "Admins can manage pagibig_brackets"
  ON public.pagibig_brackets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'accountant')
    )
  );

-- SSS
DROP POLICY IF EXISTS "Authenticated users can read sss_brackets" ON public.sss_brackets;
CREATE POLICY "Authenticated users can read sss_brackets"
  ON public.sss_brackets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage sss_brackets" ON public.sss_brackets;
CREATE POLICY "Admins can manage sss_brackets"
  ON public.sss_brackets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'accountant')
    )
  );


-- 5. Policies for Fraud Audit and Push Notifications Queue
-- Fraud Audit
DROP POLICY IF EXISTS "Admins can view fraud audit" ON public.fraud_audit;
CREATE POLICY "Admins can view fraud audit"
  ON public.fraud_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'coordinator', 'accountant')
    )
  );

DROP POLICY IF EXISTS "System and authenticated users can insert fraud audit" ON public.fraud_audit;
CREATE POLICY "System and authenticated users can insert fraud audit"
  ON public.fraud_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'coordinator', 'accountant')
    )
  );

-- Push Notifications Queue
DROP POLICY IF EXISTS "Staff can view push notifications queue" ON public.push_notifications_queue;
CREATE POLICY "Staff can view push notifications queue"
  ON public.push_notifications_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'coordinator')
    )
  );

DROP POLICY IF EXISTS "Staff can insert into push notifications queue" ON public.push_notifications_queue;
CREATE POLICY "Staff can insert into push notifications queue"
  ON public.push_notifications_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr', 'coordinator')
    )
  );

DROP POLICY IF EXISTS "Admins can manage push notifications queue" ON public.push_notifications_queue;
CREATE POLICY "Admins can manage push notifications queue"
  ON public.push_notifications_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr')
    )
  );

DROP POLICY IF EXISTS "Admins can delete from push notifications queue" ON public.push_notifications_queue;
CREATE POLICY "Admins can delete from push notifications queue"
  ON public.push_notifications_queue FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('ceo', 'hr')
    )
  );
