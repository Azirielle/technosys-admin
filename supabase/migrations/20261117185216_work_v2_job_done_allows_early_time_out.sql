-- Work v2: "Job done" now excuses an early time-out. The phone's Job done only adds a 'done' job_event (the job
-- stays ongoing, since a job can run several days), so time_out also checks for a 'done' event on that job the same
-- day. Same function as 20261117181822 otherwise.

create or replace function public.time_out(p_lat double precision, p_lon double precision, p_device_id text,
  p_queued_at timestamptz default null, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  w public.work_days%rowtype;
  v_out timestamptz := coalesce(p_queued_at, now());
  v_vehicle_office public.office_locations%rowtype;
  v_dist integer;
  v_check text;
  v_hours numeric;
  v_end timestamptz;
  v_early integer;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not public.is_my_phone(p_device_id) then return jsonb_build_object('status', 'other_phone'); end if;
  if p_queued_at is not null and (p_queued_at > now() + interval '2 minutes' or p_queued_at < now() - interval '24 hours') then
    return jsonb_build_object('status', 'queued_too_old');
  end if;

  select * into w from public.work_days where person_id = v_uid and time_out is null order by work_date desc limit 1;
  if not found then return jsonb_build_object('status', 'not_timed_in'); end if;
  if w.work_date < (v_out at time zone 'Asia/Manila')::date then
    return jsonb_build_object('status', 'forgot_time_out', 'work_day_id', w.id, 'time_in', w.time_in, 'work_date', w.work_date);
  end if;

  select o.* into v_vehicle_office
  from public.job_members m join public.vehicles v on v.id = m.vehicle_id join public.office_locations o on o.id = v.home_office_id
  where m.job_id = w.job_id and m.person_id = v_uid and m.removed_at is null and m.role = 'driver';
  if found then
    v_dist := case when p_lat is null then null else public.meters_between(p_lat, p_lon, v_vehicle_office.latitude, v_vehicle_office.longitude) end;
    if v_dist is null or v_dist > v_vehicle_office.radius_meters then
      return jsonb_build_object('status', 'bring_vehicle_back', 'office_name', v_vehicle_office.name, 'distance_m', v_dist);
    end if;
    v_check := 'at_hq';
  else
    v_dist := case when p_lat is null or w.in_lat is null then null else
      public.meters_between(p_lat, p_lon,
        coalesce((select site_lat from public.jobs where id = w.job_id and w.place = 'site'), w.in_lat),
        coalesce((select site_lon from public.jobs where id = w.job_id and w.place = 'site'), w.in_lon)) end;
    v_check := case when v_dist is not null and v_dist <= 500 then case when w.place = 'hq' then 'at_hq' else 'at_site' end else 'away' end;
  end if;

  if v_out <= w.time_in then return jsonb_build_object('status', 'too_soon'); end if;

  -- Early: more than 15 minutes before the end, and nobody pressed Job done on this job today
  select public.manila_at(w.work_date, coalesce(j.end_time, public.office_day_end())) into v_end
  from (select 1) x left join public.jobs j on j.id = w.job_id;
  v_early := greatest(0, floor(extract(epoch from (v_end - v_out)) / 60))::int;
  if v_early <= 15 or exists (select 1 from public.jobs where id = w.job_id and status = 'done')
     or exists (select 1 from public.job_events e where e.job_id = w.job_id and e.kind = 'done'
                and (e.at at time zone 'Asia/Manila')::date = w.work_date) then
    v_early := 0;
  elsif p_queued_at is null and length(trim(coalesce(p_reason, ''))) < 3 then
    return jsonb_build_object('status', 'early', 'ends_at', v_end, 'minutes_early', v_early);
  end if;

  v_hours := public.work_hours(w.id, v_out);
  update public.work_days
  set time_out = v_out, out_lat = p_lat, out_lon = p_lon, out_check = v_check, hours = v_hours,
      status = case when status = 'needs_review' or v_early > 0 then 'needs_review' else 'done' end, updated_at = now()
  where id = w.id;
  if v_early > 0 then
    insert into public.reviews (work_day_id, kind, note)
    values (w.id, 'early_time_out', coalesce(nullif(trim(p_reason), ''), 'Sent later from the phone, no reason given'));
  end if;
  return jsonb_build_object('status', 'timed_out', 'work_day_id', w.id, 'time_out', v_out, 'hours', v_hours, 'check', v_check,
    'minutes_early', v_early);
end;
$function$;

