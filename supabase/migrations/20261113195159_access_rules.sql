-- Rescue step 3: clean, readable access rules (Row-Level Security) for every table.
--
-- Three ideas, used everywhere:
--   office staff  = CEO, HR, Coordinator, Accountant  -> manage records
--   field staff   = Technician, Helper                -> see and create only their own records
--   reference data (tools, holidays, locations, announcements, policies) -> readable by everyone signed in
-- The admin server code uses the service key and is not limited by these rules; the browser and the
-- mobile app are.

-- 0. Start from zero: remove every old rule in public, and the old file-storage rules ----------------
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
           or (schemaname = 'storage' and tablename = 'objects') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 1. Roles: only the six that exist in the company -------------------------------------------------
alter table backup_20261113.profiles alter column role type text;   -- backup copy keeps plain text
create type public.staff_role as enum ('ceo', 'hr', 'coordinator', 'accountant', 'technician', 'helper');
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.staff_role using role::text::public.staff_role;
alter table public.profiles alter column role set default 'technician';
alter table public.profiles alter column role set not null;
drop type public.user_role;
alter type public.staff_role rename to user_role;

-- 2. Helper checks used by the rules -----------------------------------------------------------------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select role::text from public.profiles where id = auth.uid() and lifecycle_status in ('active', 'on_leave');
$$;

create or replace function public.is_office_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('ceo', 'hr', 'coordinator', 'accountant'), false);
$$;

create or replace function public.is_ceo_or_hr()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('ceo', 'hr'), false);
$$;

-- Is the signed-in person part of this schedule (lead, partner, driver or crew)?
create or replace function public.is_on_schedule(p_schedule_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.schedules s where s.id = p_schedule_id
                   and auth.uid() in (s.technician_id, s.senior_partner_id, s.driver_id))
      or exists (select 1 from public.schedule_crew c where c.schedule_id = p_schedule_id
                   and c.technician_id = auth.uid() and c.status = 'active');
$$;

revoke execute on function public.my_role(), public.is_office_staff(), public.is_ceo_or_hr(), public.is_on_schedule(uuid) from public, anon;
grant execute on function public.my_role(), public.is_office_staff(), public.is_ceo_or_hr(), public.is_on_schedule(uuid) to authenticated;

-- 3. Guards: things a rule can't express (which columns may change) ---------------------------------
-- Field staff may edit their own profile (photo, phone, settings) but never their role, status or files.
create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;                 -- server code / SQL editor
  if public.is_ceo_or_hr() then
    if public.my_role() = 'hr' and new.role is distinct from old.role
       and (new.role::text in ('ceo','hr','coordinator','accountant') or old.role::text in ('ceo','hr','coordinator','accountant')) then
      raise exception 'Only the CEO can change office roles';
    end if;
    return new;
  end if;
  if (new.role, new.lifecycle_status, new.employment_status, new.technician_level, new.base_salary, new.branch_id,
      new.manager_id, new.is_driver, new.hire_date, new.has_sss_id, new.has_philhealth_id, new.has_pagibig_id,
      new.has_nbi_clearance, new.has_resume, new.has_medical_clearance)
     is distinct from
     (old.role, old.lifecycle_status, old.employment_status, old.technician_level, old.base_salary, old.branch_id,
      old.manager_id, old.is_driver, old.hire_date, old.has_sss_id, old.has_philhealth_id, old.has_pagibig_id,
      old.has_nbi_clearance, old.has_resume, old.has_medical_clearance) then
    raise exception 'Only HR can change employment details';
  end if;
  return new;
end;
$$;
create trigger guard_profile_changes before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- Field staff may clock out of their own log, but never move their time-in or clear review flags.
create or replace function public.guard_attendance_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_office_staff() then return new; end if;
  if (new.technician_id, new.app_time_in, new.created_at, new.is_mocked, new.is_suspicious, new.is_manual_entry,
      new.verified_with_machine, new.photo_status, new.reviewed_by, new.reviewed_at)
     is distinct from
     (old.technician_id, old.app_time_in, old.created_at, old.is_mocked, old.is_suspicious, old.is_manual_entry,
      old.verified_with_machine, old.photo_status, old.reviewed_by, old.reviewed_at) then
    raise exception 'Time-in and review details can only be changed by the office';
  end if;
  return new;
end;
$$;
create trigger guard_attendance_changes before update on public.attendance_logs
  for each row execute function public.guard_attendance_changes();

revoke execute on function public.guard_profile_changes(), public.guard_attendance_changes() from public, anon, authenticated;

-- 4. Rules, table by table ---------------------------------------------------------------------------

-- People
create policy "signed-in users see names" on public.profiles for select to authenticated using (true);
create policy "own profile or HR/CEO edit" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_ceo_or_hr()) with check (id = auth.uid() or public.is_ceo_or_hr());
create policy "HR/CEO add or remove people" on public.profiles for insert to authenticated with check (public.is_ceo_or_hr());
create policy "HR/CEO remove people" on public.profiles for delete to authenticated using (public.is_ceo_or_hr());

create policy "own warnings or office" on public.employee_warnings for select to authenticated
  using (employee_id = auth.uid() or public.is_office_staff());
create policy "office manages warnings" on public.employee_warnings for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

-- Attendance
create policy "own logs or office" on public.attendance_logs for select to authenticated
  using (technician_id = auth.uid() or public.is_office_staff());
create policy "clock in for yourself" on public.attendance_logs for insert to authenticated
  with check (technician_id = auth.uid() or public.is_office_staff());
create policy "clock out yourself or office edits" on public.attendance_logs for update to authenticated
  using (technician_id = auth.uid() or public.is_office_staff())
  with check (technician_id = auth.uid() or public.is_office_staff());
create policy "office deletes logs" on public.attendance_logs for delete to authenticated using (public.is_office_staff());

create policy "own corrections or office" on public.attendance_corrections for select to authenticated
  using (technician_id = auth.uid() or public.is_office_staff());
create policy "office records corrections" on public.attendance_corrections for insert to authenticated
  with check (public.is_office_staff() and corrected_by = auth.uid());

create policy "office manages HQ scans" on public.biometric_scans for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "own position or office" on public.live_locations for select to authenticated
  using (technician_id = auth.uid() or public.is_office_staff());
create policy "share own position" on public.live_locations for insert to authenticated with check (technician_id = auth.uid());
create policy "update own position" on public.live_locations for update to authenticated
  using (technician_id = auth.uid()) with check (technician_id = auth.uid());

create policy "everyone reads holidays" on public.holidays for select to authenticated using (true);
create policy "office manages holidays" on public.holidays for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "everyone reads work locations" on public.office_locations for select to authenticated using (true);
create policy "office manages work locations" on public.office_locations for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

-- Scheduling
create policy "own schedules or office" on public.schedules for select to authenticated
  using (public.is_office_staff() or public.is_on_schedule(id));
create policy "office manages schedules" on public.schedules for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "crew of own schedules or office" on public.schedule_crew for select to authenticated
  using (public.is_office_staff() or public.is_on_schedule(schedule_id));
create policy "office manages crews" on public.schedule_crew for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "helpers of own schedules or office" on public.schedule_casual_helpers for select to authenticated
  using (public.is_office_staff() or public.is_on_schedule(schedule_id));
create policy "office manages schedule helpers" on public.schedule_casual_helpers for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "everyone reads casual helper names" on public.casual_helpers for select to authenticated using (true);
create policy "office manages casual helpers" on public.casual_helpers for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "office reads schedule history" on public.schedule_history for select to authenticated using (public.is_office_staff());
create policy "office writes schedule history" on public.schedule_history for insert to authenticated with check (public.is_office_staff());

-- Requests: leave and overtime
create policy "own leaves or office" on public.leaves for select to authenticated
  using (technician_id = auth.uid() or public.is_office_staff());
create policy "file own leave" on public.leaves for insert to authenticated
  with check ((technician_id = auth.uid() and status = 'pending') or public.is_office_staff());
create policy "edit own pending leave or office decides" on public.leaves for update to authenticated
  using ((technician_id = auth.uid() and status = 'pending') or public.is_office_staff())
  with check ((technician_id = auth.uid() and status = 'pending') or public.is_office_staff());
create policy "office deletes leaves" on public.leaves for delete to authenticated using (public.is_office_staff());

create policy "own overtime or office" on public.overtime_requests for select to authenticated
  using (technician_id = auth.uid() or public.is_office_staff());
create policy "file own overtime" on public.overtime_requests for insert to authenticated
  with check ((technician_id = auth.uid() and status = 'pending') or public.is_office_staff());
create policy "office decides overtime" on public.overtime_requests for update to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

-- Ticketing
create policy "own tickets or office" on public.tickets for select to authenticated
  using (employee_id = auth.uid() or public.is_office_staff());
create policy "file own ticket" on public.tickets for insert to authenticated
  with check (employee_id = auth.uid() or public.is_office_staff());
create policy "update own ticket or office" on public.tickets for update to authenticated
  using (employee_id = auth.uid() or public.is_office_staff())
  with check (employee_id = auth.uid() or public.is_office_staff());
create policy "office deletes tickets" on public.tickets for delete to authenticated using (public.is_office_staff());

-- Internal notes (is_internal) are for the office only.
create policy "messages on own tickets or office" on public.ticket_comments for select to authenticated
  using (public.is_office_staff()
         or (not coalesce(is_internal, false)
             and exists (select 1 from public.tickets t where t.id = ticket_id and t.employee_id = auth.uid())));
create policy "write on own tickets or office" on public.ticket_comments for insert to authenticated
  with check (author_id = auth.uid()
              and (public.is_office_staff()
                   or (not coalesce(is_internal, false)
                       and exists (select 1 from public.tickets t where t.id = ticket_id and t.employee_id = auth.uid()))));
create policy "mark read on own tickets or office" on public.ticket_comments for update to authenticated
  using (public.is_office_staff() or exists (select 1 from public.tickets t where t.id = ticket_id and t.employee_id = auth.uid()))
  with check (public.is_office_staff() or exists (select 1 from public.tickets t where t.id = ticket_id and t.employee_id = auth.uid()));

-- Inventory
create policy "everyone reads tools" on public.tools for select to authenticated using (true);
create policy "office manages tools" on public.tools for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "own borrowings or office" on public.tool_borrowings for select to authenticated
  using (technician_id = auth.uid() or public.is_office_staff());
create policy "office manages borrowings" on public.tool_borrowings for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

-- Announcements, policies, documents
create policy "everyone reads announcements" on public.announcements for select to authenticated using (true);
create policy "office manages announcements" on public.announcements for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());
create policy "office manages SMS contacts" on public.announcement_contacts for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "everyone reads active policies" on public.policies for select to authenticated
  using (is_active or public.is_office_staff());
create policy "public reads terms and privacy" on public.policies for select to anon
  using (is_active and id in ('terms_of_service', 'privacy_policy'));
create policy "HR/CEO manage policies" on public.policies for all to authenticated
  using (public.is_ceo_or_hr()) with check (public.is_ceo_or_hr());

create policy "own acknowledgements or office" on public.policy_acknowledgments for select to authenticated
  using (user_id = auth.uid() or public.is_office_staff());
create policy "acknowledge for yourself" on public.policy_acknowledgments for insert to authenticated
  with check (user_id = auth.uid());

create policy "everyone reads company documents" on public.documents for select to authenticated using (true);
create policy "office manages company documents" on public.documents for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());
create policy "AI knowledge readable" on public.document_chunks for select to authenticated using (true);

-- System
create policy "own activity or office" on public.activity_logs for select to authenticated
  using (actor_id = auth.uid() or public.is_office_staff());
create policy "log own activity" on public.activity_logs for insert to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

create policy "everyone reads app versions" on public.app_versions for select to authenticated using (true);
create policy "office publishes app versions" on public.app_versions for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());

create policy "own push tokens" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "office manages push queue" on public.push_notifications_queue for all to authenticated
  using (public.is_office_staff()) with check (public.is_office_staff());
create policy "office reads SMS log" on public.transactional_sms_logs for select to authenticated using (public.is_office_staff());

create policy "office reads role access" on public.role_access for select to authenticated using (public.is_office_staff());
create policy "CEO changes role access" on public.role_access for all to authenticated
  using (public.my_role() = 'ceo') with check (public.my_role() = 'ceo');

create policy "own temporary access or CEO" on public.temporary_access for select to authenticated
  using (target_user_id = auth.uid() or public.my_role() = 'ceo');
create policy "CEO grants temporary access" on public.temporary_access for all to authenticated
  using (public.my_role() = 'ceo') with check (public.my_role() = 'ceo' and granted_by = auth.uid());

-- 5. File storage --------------------------------------------------------------------------------
-- Public folders (avatars, attachments, leave files, tool photos, documents) keep working through their
-- direct links, but nobody can list or browse them. Selfies stay private: only the owner and the office.
create policy "upload to field folders" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'chat-attachments', 'leaves', 'ticket_attachments', 'dtr-selfies'));
create policy "owner or office edits field files" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'chat-attachments', 'leaves', 'ticket_attachments', 'dtr-selfies')
         and (owner = auth.uid() or public.is_office_staff()));
create policy "owner or office deletes field files" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'chat-attachments', 'leaves', 'ticket_attachments', 'dtr-selfies')
         and (owner = auth.uid() or public.is_office_staff()));
create policy "owner or office views selfies" on storage.objects for select to authenticated
  using (bucket_id = 'dtr-selfies' and (owner = auth.uid() or public.is_office_staff()));

create policy "office manages office files" on storage.objects for all to authenticated
  using (bucket_id in ('inventory', 'documents', 'app-releases') and public.is_office_staff())
  with check (bucket_id in ('inventory', 'documents', 'app-releases') and public.is_office_staff());
create policy "signed-in users download the app" on storage.objects for select to authenticated
  using (bucket_id = 'app-releases');

-- The old payroll-disputes folder accepts no new files (payroll is out of scope).
