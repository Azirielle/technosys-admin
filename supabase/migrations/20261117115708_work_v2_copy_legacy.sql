-- Work v2 switch-over, step 1: copy_legacy_to_work_v2() copies the old schedules (with their crew and temporary
-- workers) into jobs / job_members, and attendance_logs into work_days. The old tables are left as they are.
-- p_replace = true first removes earlier copies (rows with a legacy id), so it can run again after the demo seed
-- is re-run (defense morning: run the seed, then `select public.copy_legacy_to_work_v2(true);`).
--   schedule → job: dates and hours in Manila; a time-out before the start becomes start + 8 h; deployment →
--   out_of_town, office_duty → office; via_pacita_hq or office duty → report to the office; scheduled → planned,
--   in_progress → ongoing, completed → done.
--   people: schedules.technician_id = lead; schedule_crew (active) = crew / driver / helper (another "lead" row
--   becomes crew); senior_partner_id = crew; driver_id = driver; casual helpers = temporary crew.
--   attendance: the first time-in of each person's day; late = minutes after the job start when over 15;
--   counted from the start when early; outside the site → "selfie" (none was taken in the old app).
create or replace function public.copy_legacy_to_work_v2(p_replace boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hq public.office_locations%rowtype;
  v_jobs int; v_members int; v_days int;
begin
  select * into v_hq from public.office_locations where is_active order by created_at limit 1;
  if p_replace then
    delete from public.work_days where legacy_log_id is not null;
    delete from public.jobs where legacy_schedule_id is not null;
  end if;

  -- Jobs
  with src as (
    select s.*, (s.start_time at time zone 'Asia/Manila') as st, (coalesce(s.end_time, s.start_time + interval '8 hours') at time zone 'Asia/Manila') as en
    from public.schedules s
    where not exists (select 1 from public.jobs j where j.legacy_schedule_id = s.id)
  ), ins as (
    insert into public.jobs (client_name, address, project_name, site_lat, site_lon, site_radius_m, start_date, end_date, start_time, end_time,
      work_type, report_to, hq_office_id, status, cancel_reason, created_at, legacy_schedule_id)
    select coalesce(nullif(trim(client_name), ''), 'Job'), coalesce(nullif(trim(location), ''), v_hq.name), project_name,
      coalesce(geofence_lat, v_hq.latitude), coalesce(geofence_lon, v_hq.longitude), least(greatest(coalesce(geofence_radius, 150), 30), 2000),
      st::date, greatest(en::date, st::date), st::time,
      case when en::time > st::time then en::time else least(st::time + interval '8 hours', time '23:59') end,
      case assignment_type when 'deployment' then 'out_of_town' when 'office_duty' then 'office' else 'on_site' end,
      case when reporting_instruction = 'via_pacita_hq' or assignment_type = 'office_duty' then 'hq' else 'site' end,
      case when reporting_instruction = 'via_pacita_hq' or assignment_type = 'office_duty' then v_hq.id end,
      case status when 'cancelled' then 'cancelled' when 'completed' then 'done' when 'in_progress' then 'ongoing' else 'planned' end,
      case when status = 'cancelled' then coalesce(nullif(trim(cancellation_reason), ''), 'Cancelled before Work v2') end,
      created_at, id
    from src
    returning 1
  ) select count(*) into v_jobs from ins;

  -- People on each job (one row per person; the schedule's technician is the lead)
  with people as (
    select j.id job_id, s.technician_id person_id, 'lead' role, 0 pri from public.jobs j join public.schedules s on s.id = j.legacy_schedule_id where s.technician_id is not null
    union all
    select j.id, s.driver_id, 'driver', 1 from public.jobs j join public.schedules s on s.id = j.legacy_schedule_id where s.driver_id is not null
    union all
    select j.id, c.technician_id, case c.assignment_role when 'driver' then 'driver' when 'helper' then 'helper' else 'crew' end, 2
    from public.jobs j join public.schedule_crew c on c.schedule_id = j.legacy_schedule_id where c.status = 'active'
    union all
    select j.id, s.senior_partner_id, 'crew', 3 from public.jobs j join public.schedules s on s.id = j.legacy_schedule_id where s.senior_partner_id is not null
  ), picked as (
    select distinct on (job_id, person_id) job_id, person_id, role from people order by job_id, person_id, pri
  ), ins as (
    insert into public.job_members (job_id, person_id, role)
    select p.job_id, p.person_id, p.role from picked p
    where not exists (select 1 from public.job_members m where m.job_id = p.job_id and m.person_id = p.person_id and m.removed_at is null)
    returning 1
  ) select count(*) into v_members from ins;

  insert into public.job_members (job_id, temp_worker_id, role)
  select j.id, h.casual_helper_id, 'crew' from public.jobs j join public.schedule_casual_helpers h on h.schedule_id = j.legacy_schedule_id
  where not exists (select 1 from public.job_members m where m.job_id = j.id and m.temp_worker_id = h.casual_helper_id and m.removed_at is null);

  -- Work days: the first time-in of each person's Manila day, matched to their job that day
  with firsts as (
    select distinct on (l.technician_id, (l.app_time_in at time zone 'Asia/Manila')::date) l.*, (l.app_time_in at time zone 'Asia/Manila')::date d
    from public.attendance_logs l
    where l.app_time_in is not null and not exists (select 1 from public.work_days w where w.legacy_log_id = l.id)
    order by l.technician_id, (l.app_time_in at time zone 'Asia/Manila')::date, l.app_time_in
  ), matched as (
    select f.*, j.id job_id, j.client_name, j.report_to, j.start_time job_start,
      public.manila_at(f.d, coalesce(j.start_time, public.office_day_start())) start_at
    from firsts f
    left join lateral (
      select j.* from public.jobs j join public.job_members m on m.job_id = j.id
      where m.person_id = f.technician_id and m.removed_at is null and j.status <> 'cancelled' and f.d between j.start_date and j.end_date
      order by j.start_time limit 1
    ) j on true
    where not exists (select 1 from public.work_days w where w.person_id = f.technician_id and w.work_date = f.d)
  ), ins as (
    insert into public.work_days (person_id, work_date, job_id, place, place_name, time_in, counted_from, late_minutes,
      in_lat, in_lon, in_accuracy_m, in_check, in_reason, selfie_path, is_mocked, device_id,
      time_out, out_check, hours, status, created_at, legacy_log_id)
    select technician_id, d, job_id,
      case when job_id is not null and report_to = 'site' then 'site' else 'hq' end,
      coalesce(case when report_to = 'site' then client_name end, v_hq.name),
      app_time_in, greatest(app_time_in, start_at),
      case when extract(epoch from (app_time_in - start_at)) / 60 > 15 then floor(extract(epoch from (app_time_in - start_at)) / 60)::int else 0 end,
      latitude, longitude, gps_accuracy,
      case when geofence_status = 'outside' then 'selfie' else 'inside' end,
      case when geofence_status = 'outside' then 'Outside the site (old app, no selfie)' end,
      case when geofence_status = 'outside' then coalesce(photo_url, 'legacy:no-photo') end,
      coalesce(is_mocked, false), device_id,
      case when app_time_out > app_time_in then app_time_out end,
      case when app_time_out > app_time_in then 'away' end,
      total_hours,
      case when app_time_out is null or app_time_out <= app_time_in then (case when d < public.manila_today() then 'no_time_out' else 'working' end)
           when status = 'pending_close' then 'needs_review' else 'done' end,
      created_at, id
    from matched
    returning 1
  ) select count(*) into v_days from ins;

  return jsonb_build_object('jobs', v_jobs, 'members', v_members, 'work_days', v_days);
end;
$$;
revoke execute on function public.copy_legacy_to_work_v2(boolean) from public, anon, authenticated;
