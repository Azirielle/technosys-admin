-- ==============================================================================
-- CHUNK 40: RELATIONAL INDEX COVERAGE & RLS SUBQUERY INITPLAN CACHING
-- ==============================================================================

-- 1. Covering B-Tree Index Coverage (45 Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_queue_user_id ON public.ai_chat_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_last_edited_by ON public.announcements(last_edited_by);
CREATE INDEX IF NOT EXISTS idx_announcements_target_branch_id ON public.announcements(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_by ON public.app_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_branch_id ON public.documents(branch_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dtr_override_logs_log_id ON public.dtr_override_logs(log_id);
CREATE INDEX IF NOT EXISTS idx_dtr_override_logs_modifier_id ON public.dtr_override_logs(modifier_id);
CREATE INDEX IF NOT EXISTS idx_dtr_override_logs_target_id ON public.dtr_override_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_employee_id ON public.employee_warnings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_issued_by ON public.employee_warnings(issued_by);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_last_edited_by ON public.employee_warnings(last_edited_by);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_service_dept_reviewer_id ON public.employee_warnings(service_dept_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_fraud_audit_time_log_id ON public.fraud_audit(time_log_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_items_audit_id ON public.inventory_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_auditor_id ON public.inventory_audits(auditor_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_technician_id ON public.leave_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_leaves_technician_id ON public.leaves(technician_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_technician_id ON public.live_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_reviewed_by ON public.overtime_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_payroll_disputes_payslip_id ON public.payroll_disputes(payslip_id);
CREATE INDEX IF NOT EXISTS idx_payroll_disputes_technician_id ON public.payroll_disputes(technician_id);
CREATE INDEX IF NOT EXISTS idx_payslips_technician_id ON public.payslips(technician_id);
CREATE INDEX IF NOT EXISTS idx_physical_biometric_scans_employee_id ON public.physical_biometric_scans(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_queue_user_id ON public.push_notifications_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_role_overrides_granted_by ON public.role_overrides(granted_by);
CREATE INDEX IF NOT EXISTS idx_schedules_driver_id ON public.schedules(driver_id);
CREATE INDEX IF NOT EXISTS idx_schedules_senior_partner_id ON public.schedules(senior_partner_id);
CREATE INDEX IF NOT EXISTS idx_schedules_technician_id ON public.schedules(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_employee_id ON public.tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_id ON public.ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_clocked_out_by ON public.time_logs(clocked_out_by);
CREATE INDEX IF NOT EXISTS idx_time_logs_reviewed_by ON public.time_logs(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_time_logs_technician_id ON public.time_logs(technician_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_technician_id ON public.tool_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_tool_handovers_technician_id ON public.tool_handovers(technician_id);
CREATE INDEX IF NOT EXISTS idx_tool_handovers_tool_id ON public.tool_handovers(tool_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_schedule_id ON public.work_orders(schedule_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON public.work_orders(technician_id);

-- 2. RLS InitPlan Optimization (Wrap auth functions in scalar subqueries)

-- activity_logs
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins/Staff can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'hr'::user_role, 'ceo'::user_role, 'coo'::user_role])
  ));

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Technicians/Helpers can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Technicians/Helpers can view their own activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (actor_id = (SELECT auth.uid()));

-- ai_chat_queue
DROP POLICY IF EXISTS "Users can manage their own queue items" ON public.ai_chat_queue;
CREATE POLICY "Users can manage their own queue items" ON public.ai_chat_queue
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- announcement_contacts
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.announcement_contacts;
CREATE POLICY "Enable delete for authenticated users" ON public.announcement_contacts
  FOR DELETE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.announcement_contacts;
CREATE POLICY "Enable insert for authenticated users" ON public.announcement_contacts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.announcement_contacts;
CREATE POLICY "Enable read access for authenticated users" ON public.announcement_contacts
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.announcement_contacts;
CREATE POLICY "Enable update for authenticated users" ON public.announcement_contacts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- announcements
DROP POLICY IF EXISTS "Admins/Staff can manage announcements" ON public.announcements;
CREATE POLICY "Admins/Staff can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role <> ALL (ARRAY['technician'::user_role, 'helper'::user_role])
  ));

DROP POLICY IF EXISTS "Anyone authenticated can view announcements" ON public.announcements;
CREATE POLICY "Anyone authenticated can view announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.announcements;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.announcements;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.announcements;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.announcements;

-- app_versions
DROP POLICY IF EXISTS "Admins can manage app versions" ON public.app_versions;
CREATE POLICY "Admins can manage app versions" ON public.app_versions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text IN ('admin', 'super_admin', 'ceo')
  ));

DROP POLICY IF EXISTS "Anyone authenticated can view app versions" ON public.app_versions;
CREATE POLICY "Anyone authenticated can view app versions" ON public.app_versions
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- documents
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
CREATE POLICY "Admins can manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'ceo'::user_role])
  ));

DROP POLICY IF EXISTS "Anyone authenticated can view documents" ON public.documents;
CREATE POLICY "Anyone authenticated can view documents" ON public.documents
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- dtr_override_logs
DROP POLICY IF EXISTS "Admins/Staff can view all DTR override logs" ON public.dtr_override_logs;
CREATE POLICY "Admins/Staff can view all DTR override logs" ON public.dtr_override_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role <> ALL (ARRAY['technician'::user_role, 'helper'::user_role])
  ));

DROP POLICY IF EXISTS "Authenticated users can insert DTR override logs" ON public.dtr_override_logs;
CREATE POLICY "Authenticated users can insert DTR override logs" ON public.dtr_override_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Technicians/Helpers can view their own DTR override logs" ON public.dtr_override_logs;
CREATE POLICY "Technicians/Helpers can view their own DTR override logs" ON public.dtr_override_logs
  FOR SELECT TO authenticated
  USING (target_id = (SELECT auth.uid()));

-- employee_warnings
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.employee_warnings;
CREATE POLICY "Enable delete for authenticated users" ON public.employee_warnings
  FOR DELETE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.employee_warnings;
CREATE POLICY "Enable insert for authenticated users" ON public.employee_warnings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.employee_warnings;
CREATE POLICY "Enable read access for authenticated users" ON public.employee_warnings
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.employee_warnings;
CREATE POLICY "Enable update for authenticated users" ON public.employee_warnings
  FOR UPDATE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- holidays
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
CREATE POLICY "Admins can manage holidays" ON public.holidays
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'hr'::user_role, 'ceo'::user_role])
  ));

DROP POLICY IF EXISTS "Anyone authenticated can view holidays" ON public.holidays;
CREATE POLICY "Anyone authenticated can view holidays" ON public.holidays
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- inventory_audits & items
DROP POLICY IF EXISTS "Admins can manage audits" ON public.inventory_audits;
CREATE POLICY "Admins can manage audits" ON public.inventory_audits
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'coordinator'::user_role, 'ceo'::user_role])
  ));

DROP POLICY IF EXISTS "Admins can manage audit items" ON public.inventory_audit_items;
CREATE POLICY "Admins can manage audit items" ON public.inventory_audit_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'coordinator'::user_role, 'ceo'::user_role])
  ));

-- leave_requests & leaves
DROP POLICY IF EXISTS "Technicians can create their own leave requests" ON public.leave_requests;
CREATE POLICY "Technicians can create their own leave requests" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Technicians can view their own leave requests" ON public.leave_requests;
CREATE POLICY "Technicians can view their own leave requests" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all leaves" ON public.leaves;
CREATE POLICY "Admins can manage all leaves" ON public.leaves
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['hr'::user_role, 'ceo'::user_role, 'coo'::user_role, 'admin'::user_role, 'super_admin'::user_role])
  ));

DROP POLICY IF EXISTS "Technicians can insert own leaves" ON public.leaves;
CREATE POLICY "Technicians can insert own leaves" ON public.leaves
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Technicians can update own pending leaves" ON public.leaves;
CREATE POLICY "Technicians can update own pending leaves" ON public.leaves
  FOR UPDATE TO authenticated
  USING (technician_id = (SELECT auth.uid()) AND status = 'pending');

DROP POLICY IF EXISTS "Technicians can view own leaves" ON public.leaves;
CREATE POLICY "Technicians can view own leaves" ON public.leaves
  FOR SELECT TO authenticated
  USING (technician_id = (SELECT auth.uid()));

-- live_locations
DROP POLICY IF EXISTS "Staff can view all live locations" ON public.live_locations;
CREATE POLICY "Staff can view all live locations" ON public.live_locations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'coordinator'::user_role, 'ceo'::user_role])
  ));

DROP POLICY IF EXISTS "Technicians can insert own live locations" ON public.live_locations;
CREATE POLICY "Technicians can insert own live locations" ON public.live_locations
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Technicians can view own live locations" ON public.live_locations;
CREATE POLICY "Technicians can view own live locations" ON public.live_locations
  FOR SELECT TO authenticated
  USING (technician_id = (SELECT auth.uid()));

-- overtime_requests
DROP POLICY IF EXISTS "Enable insert for own records" ON public.overtime_requests;
CREATE POLICY "Enable insert for own records" ON public.overtime_requests
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Enable select for authorized roles or own records" ON public.overtime_requests;
CREATE POLICY "Enable select for authorized roles or own records" ON public.overtime_requests
  FOR SELECT TO authenticated
  USING (technician_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'coordinator'::user_role, 'ceo'::user_role, 'coo'::user_role, 'hr'::user_role, 'svp'::user_role])
  ));

DROP POLICY IF EXISTS "Enable update for reviews" ON public.overtime_requests;
CREATE POLICY "Enable update for reviews" ON public.overtime_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'coordinator'::user_role, 'ceo'::user_role, 'coo'::user_role, 'hr'::user_role, 'svp'::user_role])
  ));

-- payroll_disputes
DROP POLICY IF EXISTS "Staff can view all disputes" ON public.payroll_disputes;
CREATE POLICY "Staff can view all disputes" ON public.payroll_disputes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'hr'::user_role, 'ceo'::user_role, 'accountant'::user_role])
  ));

DROP POLICY IF EXISTS "Technicians can insert own disputes" ON public.payroll_disputes;
CREATE POLICY "Technicians can insert own disputes" ON public.payroll_disputes
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Technicians can view own disputes" ON public.payroll_disputes;
CREATE POLICY "Technicians can view own disputes" ON public.payroll_disputes
  FOR SELECT TO authenticated
  USING (technician_id = (SELECT auth.uid()));

-- physical_biometric_scans
DROP POLICY IF EXISTS "Anyone authenticated can insert biometric scans" ON public.physical_biometric_scans;
CREATE POLICY "Anyone authenticated can insert biometric scans" ON public.physical_biometric_scans
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Anyone authenticated can view biometric scans" ON public.physical_biometric_scans;
CREATE POLICY "Anyone authenticated can view biometric scans" ON public.physical_biometric_scans
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- profiles
DROP POLICY IF EXISTS "Allow authenticated update" ON public.profiles;
CREATE POLICY "Allow authenticated update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- push_tokens
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update their own push tokens" ON public.push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- role_overrides
DROP POLICY IF EXISTS "Allow modification by super admin or CEO" ON public.role_overrides;
CREATE POLICY "Allow modification by super admin or CEO" ON public.role_overrides
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['super_admin'::user_role, 'ceo'::user_role])
  ));

-- technician_locations
DROP POLICY IF EXISTS "Enable insert for users based on technician_id" ON public.technician_locations;
CREATE POLICY "Enable insert for users based on technician_id" ON public.technician_locations
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Enable update for users based on technician_id" ON public.technician_locations;
CREATE POLICY "Enable update for users based on technician_id" ON public.technician_locations
  FOR UPDATE TO authenticated
  USING (technician_id = (SELECT auth.uid()))
  WITH CHECK (technician_id = (SELECT auth.uid()));

-- tickets & ticket_comments
DROP POLICY IF EXISTS "Employees can create own tickets" ON public.tickets;
CREATE POLICY "Employees can create own tickets" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Employees can update own tickets" ON public.tickets;
CREATE POLICY "Employees can update own tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Employees can view own tickets" ON public.tickets;
CREATE POLICY "Employees can view own tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins/Staff can manage all tickets" ON public.tickets;
CREATE POLICY "Admins/Staff can manage all tickets" ON public.tickets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role <> ALL (ARRAY['technician'::user_role, 'helper'::user_role])
  ));

DROP POLICY IF EXISTS "Users can create comments for accessible tickets" ON public.ticket_comments;
CREATE POLICY "Users can create comments for accessible tickets" ON public.ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
        AND (tickets.employee_id = (SELECT auth.uid()) OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role <> ALL (ARRAY['technician'::user_role, 'helper'::user_role])
        ))
    )
  );

DROP POLICY IF EXISTS "Users can update comments for accessible tickets" ON public.ticket_comments;
CREATE POLICY "Users can update comments for accessible tickets" ON public.ticket_comments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.employee_id = (SELECT auth.uid()) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = 'admin'::user_role
      ))
  ));

DROP POLICY IF EXISTS "Users can view comments for accessible tickets" ON public.ticket_comments;
CREATE POLICY "Users can view comments for accessible tickets" ON public.ticket_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.employee_id = (SELECT auth.uid()) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role <> ALL (ARRAY['technician'::user_role, 'helper'::user_role])
      ))
  ));

-- time_logs
DROP POLICY IF EXISTS "Accountants and HR can read audit logs" ON public.time_logs;
CREATE POLICY "Accountants and HR can read audit logs" ON public.time_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT profiles.role FROM public.profiles WHERE profiles.id = (SELECT auth.uid()))
    = ANY (ARRAY['accountant'::user_role, 'hr'::user_role, 'super_admin'::user_role, 'ceo'::user_role])
  );

DROP POLICY IF EXISTS "Technicians can insert own clock_in" ON public.time_logs;
CREATE POLICY "Technicians can insert own clock_in" ON public.time_logs
  FOR INSERT TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

-- tool_assignments
DROP POLICY IF EXISTS "Enable write access for tool assignments" ON public.tool_assignments;
CREATE POLICY "Enable write access for tool assignments" ON public.tool_assignments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = ANY (ARRAY['coordinator'::text, 'super_admin'::text, 'ceo'::text])
  ));

-- work_orders
DROP POLICY IF EXISTS "Users can update their own work orders" ON public.work_orders;
CREATE POLICY "Users can update their own work orders" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (technician_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own work orders" ON public.work_orders;
CREATE POLICY "Users can view their own work orders" ON public.work_orders
  FOR SELECT TO authenticated
  USING (technician_id = (SELECT auth.uid()));
