-- Rescue step 1: remove duplicate / unused / payroll tables and give the rest plain names.
-- Backup of every table taken first in schema backup_20261113.

-- 1. Things nothing uses any more -------------------------------------------------
select cron.unschedule('process-ai-chat-queue');            -- old AI queue, replaced by direct streaming
drop table public.ai_chat_queue;

drop trigger trigger_sync_technician_locations on public.live_locations;
drop table public.live_locations;                            -- duplicate of technician_locations, never used
drop function public.sync_technician_locations();

insert into public.leaves (id, technician_id, start_date, end_date, leave_type, reason, status, created_at)
select id, technician_id, start_date, end_date, leave_type, reason, status, created_at from public.leave_requests;
drop table public.leave_requests;                            -- duplicate of leaves (mobile wrote here, HR read leaves)

drop table public.work_orders;                               -- duplicate of schedules
drop table public.tool_assignments;                          -- duplicate of tool_handovers, never used
drop table public.inventory_audit_items, public.inventory_audits;  -- never used
drop table public.fraud_audit;                               -- never used
drop table public.dtr_override_logs;                         -- only used by dead code; corrections live in time_log_corrections
drop function public.handle_low_stock_trigger();             -- points at a table that doesn't exist

-- 2. Payroll is out of scope (panel decision) --------------------------------------
drop table public.payroll_disputes, public.payslips, public.payroll_cutoff_locks,
           public.sss_brackets, public.philhealth_rules, public.pagibig_brackets;
alter table public.leaves drop column payroll_processed_at;

-- 3. PostGIS: only two unused columns needed it --------------------------------------
alter table public.time_logs drop column clock_in_location, drop column clock_out_location;
alter table backup_20261113.time_logs                       -- keep the backup copy readable without PostGIS
  alter column clock_in_location type text using clock_in_location::text,
  alter column clock_out_location type text using clock_out_location::text;
drop extension postgis;                                      -- also removes spatial_ref_sys (security advisor error)

-- 4. Plain names ------------------------------------------------------------------
alter table public.time_logs                 rename to attendance_logs;
alter table public.technician_locations      rename to live_locations;
alter table public.time_log_corrections      rename to attendance_corrections;
alter table public.physical_biometric_scans  rename to biometric_scans;
alter table public.schedule_crew_assignments rename to schedule_crew;
alter table public.schedule_change_logs      rename to schedule_history;
alter table public.tool_catalog              rename to tools;
alter table public.tool_handovers            rename to tool_borrowings;
alter table public.company_policies          rename to policies;
alter table public.role_overrides            rename to temporary_access;
alter table public.system_overrides          rename to role_access;

-- Constraint and index names follow the new table names (so error messages make sense).
do $$
declare
  m record; r record;
begin
  for m in select * from (values
    ('time_logs','attendance_logs'), ('technician_locations','live_locations'),
    ('time_log_corrections','attendance_corrections'), ('physical_biometric_scans','biometric_scans'),
    ('schedule_crew_assignments','schedule_crew'), ('crew_assignments','schedule_crew'),
    ('schedule_change_logs','schedule_history'), ('change_logs','schedule_history'),
    ('tool_catalog','tools'), ('tool_handovers','tool_borrowings'),
    ('company_policies','policies'), ('role_overrides','temporary_access'), ('system_overrides','role_access')
  ) v(old_name, new_name) loop
    for r in select conrelid::regclass as tbl, conname from pg_constraint
             where connamespace = 'public'::regnamespace and conname like '%' || m.old_name || '%' loop
      execute format('alter table %s rename constraint %I to %I', r.tbl, r.conname, replace(r.conname, m.old_name, m.new_name));
    end loop;
    for r in select indexname from pg_indexes
             where schemaname = 'public' and indexname like '%' || m.old_name || '%'
               and indexname not in (select conname from pg_constraint where connamespace = 'public'::regnamespace) loop
      execute format('alter index public.%I rename to %I', r.indexname, replace(r.indexname, m.old_name, m.new_name));
    end loop;
  end loop;
end $$;

-- Function bodies don't follow renames automatically.
create or replace function public.prevent_duplicate_clockins()
returns trigger language plpgsql set search_path = 'public', 'pg_temp' as $$
begin
  -- Ignore a second time-in from the same person within 5 minutes (double taps, retries).
  if exists (select 1 from public.attendance_logs
             where technician_id = new.technician_id and created_at >= now() - interval '5 minutes') then
    return null;
  end if;
  return new;
end;
$$;
