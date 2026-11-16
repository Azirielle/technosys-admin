-- Work v2, part 3: what saving a job checks (plan: docs/job-workflow-sketch.html, "Scheduling: what saving a job checks").
-- job_save_checks lists every problem for the people and vehicle picked, as rows the Coordinator's form shows:
--   blocking  on_leave (approved leave), other_job (already on a job at that time), inactive, vehicle_busy, vehicle_unavailable
--   warning   pending_leave, no_phone (can't time in until they set up the app)
-- The job form saves only when there is no blocking row.

create or replace function public.job_save_checks(
  p_person_ids uuid[], p_start_date date, p_end_date date, p_start_time time, p_end_time time,
  p_vehicle_id uuid default null, p_exclude_job_id uuid default null
) returns table (person_id uuid, vehicle_id uuid, kind text, blocking boolean, detail text)
language sql stable security definer set search_path = '' as $$
  with people as (select unnest(coalesce(p_person_ids, '{}'::uuid[])) as id)
  -- Approved or pending leave on any of the job's days
  select l.technician_id, null::uuid,
         case when l.status = 'approved' then 'on_leave' else 'pending_leave' end,
         l.status = 'approved',
         p.full_name || ' is on ' || l.leave_type || ' leave ' || to_char(l.start_date, 'Mon DD') ||
           case when l.end_date <> l.start_date then '–' || to_char(l.end_date, 'Mon DD') else '' end ||
           case when l.status = 'approved' then '.' else ' (waiting for HR).' end
  from public.leaves l join people pp on pp.id = l.technician_id join public.profiles p on p.id = l.technician_id
  where l.status in ('approved', 'pending') and l.start_date <= p_end_date and l.end_date >= p_start_date
  union all
  -- Already on another job whose days and hours overlap
  select m.person_id, null::uuid, 'other_job', true,
         p.full_name || ' is already on ' || j.client_name || ' (' || to_char(j.start_date, 'Mon DD') || ', ' ||
           to_char(j.start_time, 'HH12:MI AM') || '–' || to_char(j.end_time, 'HH12:MI AM') || ').'
  from public.job_members m join people pp on pp.id = m.person_id
  join public.jobs j on j.id = m.job_id join public.profiles p on p.id = m.person_id
  where m.removed_at is null and j.status in ('planned', 'ongoing')
    and (p_exclude_job_id is null or j.id <> p_exclude_job_id)
    and j.start_date <= p_end_date and j.end_date >= p_start_date
    and j.start_time < p_end_time and j.end_time > p_start_time
  union all
  -- Not working here any more
  select p.id, null::uuid, 'inactive', true, p.full_name || ' is not active (' || coalesce(p.lifecycle_status, 'unknown') || ').'
  from public.profiles p join people pp on pp.id = p.id
  where coalesce(p.lifecycle_status, 'active') not in ('active', 'on_leave')
  union all
  -- No registered work phone yet
  select p.id, null::uuid, 'no_phone', false, p.full_name || ' can''t time in until they set up the app on their work phone.'
  from public.profiles p join people pp on pp.id = p.id
  where not exists (select 1 from public.registered_devices d where d.profile_id = p.id)
  union all
  -- The vehicle is out on another job at that time, or not usable
  select null::uuid, v.id, 'vehicle_busy', true,
         v.name || ' (' || v.plate || ') is already on ' || j.client_name || ' (' || to_char(j.start_date, 'Mon DD') || ').'
  from public.vehicles v join public.job_members m on m.vehicle_id = v.id and m.removed_at is null
  join public.jobs j on j.id = m.job_id
  where v.id = p_vehicle_id and j.status in ('planned', 'ongoing')
    and (p_exclude_job_id is null or j.id <> p_exclude_job_id)
    and j.start_date <= p_end_date and j.end_date >= p_start_date
    and j.start_time < p_end_time and j.end_time > p_start_time
  union all
  select null::uuid, v.id, 'vehicle_unavailable', true, v.name || ' (' || v.plate || ') is ' || replace(v.status, '_', ' ') || '.'
  from public.vehicles v where v.id = p_vehicle_id and v.status <> 'active';
$$;
revoke execute on function public.job_save_checks(uuid[], date, date, time, time, uuid, uuid) from public, anon;
grant execute on function public.job_save_checks(uuid[], date, date, time, time, uuid, uuid) to authenticated;
