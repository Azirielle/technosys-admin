-- Work v2: offline punches that go to review now say when the server received them, next to the time they were
-- taken (the phone sets that time), so a back-dated "saved offline" time-in stands out. Also a simpler v_check.
-- Same functions as 20261118204302_work_v2_offline_punches_never_lost otherwise.
create or replace function public.time_in(
  p_lat double precision, p_lon double precision, p_accuracy_m double precision, p_mocked boolean, p_device_id text,
  p_selfie_path text default null, p_reason text default null, p_office_duty boolean default false,
  p_queued_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.manila_today();
  v_now timestamptz := now();
  v_at timestamptz;
  v_job public.jobs%rowtype;
  v_has_job boolean := false;
  v_start timestamptz;
  v_place text; v_place_name text; v_lat double precision; v_lon double precision; v_radius integer;
  v_dist integer;
  v_inside boolean;
  v_offline_unsure boolean;
  v_received text := '; received ' || to_char(now() at time zone 'Asia/Manila', 'Mon DD, HH12:MI AM');
  v_check text; v_status text; v_reason text;
  v_open public.work_days%rowtype;
  v_id uuid;
  v_late integer;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if public.my_role() not in ('technician', 'helper') then return jsonb_build_object('status', 'not_field_staff'); end if;
  if not public.is_my_phone(p_device_id) then return jsonb_build_object('status', 'other_phone'); end if;

  -- A time-in saved on the phone without signal keeps its own time (within the last 12 hours)
  v_at := v_now;
  if p_queued_at is not null then
    if p_queued_at > v_now + interval '2 minutes' or p_queued_at < v_now - interval '12 hours' then
      return jsonb_build_object('status', 'queued_too_old');
    end if;
    v_at := p_queued_at;
    v_today := (p_queued_at at time zone 'Asia/Manila')::date;
  end if;

  select * into v_open from public.work_days where person_id = v_uid and work_date = v_today;
  if found then return jsonb_build_object('status', 'already', 'work_day_id', v_open.id, 'time_in', v_open.time_in); end if;

  select * into v_open from public.work_days
  where person_id = v_uid and time_out is null and work_date < v_today order by work_date desc limit 1;
  if found then
    return jsonb_build_object('status', 'forgot_time_out', 'work_day_id', v_open.id, 'time_in', v_open.time_in, 'work_date', v_open.work_date);
  end if;

  -- Today's job (the earliest one today), or office duty at the nearest office
  select j.* into v_job
  from public.jobs j
  where j.status in ('planned', 'ongoing') and v_today between j.start_date and j.end_date
    and exists (select 1 from public.job_members m where m.job_id = j.id and m.person_id = v_uid and m.removed_at is null)
  order by j.start_time limit 1;
  v_has_job := found;

  if not v_has_job and not p_office_duty then return jsonb_build_object('status', 'no_job'); end if;

  v_start := public.manila_at(v_today, case when v_has_job then v_job.start_time else public.office_day_start() end);
  if v_at < v_start - interval '60 minutes' then
    return jsonb_build_object('status', 'too_early', 'opens_at', v_start - interval '60 minutes');
  end if;

  -- Where to time in: the job site, or the office (HQ jobs, office duty)
  if v_has_job and v_job.report_to = 'site' then
    v_place := 'site'; v_place_name := v_job.client_name; v_lat := v_job.site_lat; v_lon := v_job.site_lon; v_radius := v_job.site_radius_m;
  else
    select 'hq', o.name, o.latitude, o.longitude, o.radius_meters into v_place, v_place_name, v_lat, v_lon, v_radius
    from public.office_locations o
    where o.is_active and (not v_has_job or o.id = v_job.hq_office_id)
    order by case when p_lat is null then 0 else public.meters_between(p_lat, p_lon, o.latitude, o.longitude) end
    limit 1;
    if v_place is null then return jsonb_build_object('status', 'no_place'); end if;
  end if;

  v_dist := case when p_lat is null then null else public.meters_between(p_lat, p_lon, v_lat, v_lon) end;
  v_inside := v_dist is not null and v_dist <= v_radius and not coalesce(p_mocked, false);
  -- Sent later from the phone and the place couldn't be confirmed: no selfie possible offline, so HR checks it
  v_offline_unsure := not v_inside and p_selfie_path is null and p_queued_at is not null;

  if not v_inside and p_selfie_path is null and not v_offline_unsure then
    return jsonb_build_object(
      'status', case when p_lat is null then 'need_selfie' when coalesce(p_mocked, false) then 'fake_gps' else 'outside' end,
      'distance_m', v_dist, 'place_name', v_place_name, 'place_lat', v_lat, 'place_lon', v_lon, 'radius_m', v_radius);
  end if;
  if not v_inside and not v_offline_unsure then
    if length(trim(coalesce(p_reason, ''))) < 3 then return jsonb_build_object('status', 'need_reason'); end if;
    if p_selfie_path not like v_uid::text || '%' then return jsonb_build_object('status', 'bad_selfie'); end if;
  end if;

  v_check := case when not v_inside and not v_offline_unsure then 'selfie' when p_queued_at is not null then 'queued' else 'inside' end;
  v_status := case when v_check = 'selfie' or v_offline_unsure then 'needs_review' else 'working' end;
  v_reason := case
    when v_offline_unsure and p_lat is null then 'Saved on the phone with no signal and no GPS; place not confirmed' || v_received
    when v_offline_unsure then 'Saved on the phone with no signal, ' || v_dist || ' m from ' || v_place_name || v_received
    when not v_inside then trim(p_reason) end;
  v_late := greatest(0, floor(extract(epoch from (v_at - v_start)) / 60))::int;

  insert into public.work_days (person_id, work_date, job_id, place, place_name, time_in, counted_from, late_minutes,
    in_lat, in_lon, in_accuracy_m, in_distance_m, in_check, in_reason, selfie_path, is_mocked, device_id, status)
  values (v_uid, v_today, v_job.id, v_place, v_place_name, v_at, greatest(v_at, v_start),
    case when v_late > 15 then v_late else 0 end,
    p_lat, p_lon, p_accuracy_m, v_dist, v_check, v_reason,
    case when v_inside then null else p_selfie_path end, coalesce(p_mocked, false), p_device_id, v_status)
  returning id into v_id;

  if v_check = 'selfie' or v_offline_unsure then
    insert into public.reviews (work_day_id, kind, note)
    values (v_id, case when coalesce(p_mocked, false) then 'fake_gps' when v_offline_unsure then 'offline_time_in' else 'selfie_time_in' end, v_reason);
  end if;
  if v_has_job and v_job.status = 'planned' then
    update public.jobs set status = 'ongoing', updated_at = now() where id = v_job.id;
  end if;

  return jsonb_build_object('status', 'timed_in', 'work_day_id', v_id, 'check', v_check,
    'late_minutes', case when v_late > 15 then v_late else 0 end, 'place_name', v_place_name, 'counted_from', greatest(v_at, v_start));
end;
$$;

create or replace function public.time_out(
  p_lat double precision, p_lon double precision, p_device_id text, p_queued_at timestamptz default null, p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
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
  v_driver_away boolean := false;
  v_received text := '; received ' || to_char(now() at time zone 'Asia/Manila', 'Mon DD, HH12:MI AM');
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

  -- A driver brings the vehicle back to its home office first (sent later from the phone: saved, HR checks it)
  select o.* into v_vehicle_office
  from public.job_members m join public.vehicles v on v.id = m.vehicle_id join public.office_locations o on o.id = v.home_office_id
  where m.job_id = w.job_id and m.person_id = v_uid and m.removed_at is null and m.role = 'driver';
  if found then
    v_dist := case when p_lat is null then null else public.meters_between(p_lat, p_lon, v_vehicle_office.latitude, v_vehicle_office.longitude) end;
    v_driver_away := v_dist is null or v_dist > v_vehicle_office.radius_meters;
    if v_driver_away and p_queued_at is null then
      return jsonb_build_object('status', 'bring_vehicle_back', 'office_name', v_vehicle_office.name, 'distance_m', v_dist);
    end if;
    v_check := case when v_driver_away then 'away' else 'at_hq' end;
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
      status = case when status = 'needs_review' or v_early > 0 or v_driver_away then 'needs_review' else 'done' end, updated_at = now()
  where id = w.id;
  if v_early > 0 then
    insert into public.reviews (work_day_id, kind, note)
    values (w.id, 'early_time_out', coalesce(nullif(trim(p_reason), ''), 'Sent later from the phone, no reason given'));
  end if;
  if v_driver_away then
    insert into public.reviews (work_day_id, kind, note)
    values (w.id, 'driver_away', 'Saved on the phone with no signal; not confirmed at ' || v_vehicle_office.name
      || case when v_dist is null then ' (no GPS)' else ' (' || v_dist || ' m away)' end || v_received);
  end if;
  return jsonb_build_object('status', 'timed_out', 'work_day_id', w.id, 'time_out', v_out, 'hours', v_hours, 'check', v_check,
    'minutes_early', v_early);
end;
$$;
