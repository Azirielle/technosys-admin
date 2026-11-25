-- Four kinds of work (B6): on_site, out_of_town, office, in_house
-- In-house work reports to client building, no time-in on the app.

alter table public.jobs
  drop constraint if exists jobs_work_type_check;

alter table public.jobs
  add constraint jobs_work_type_check
  check (work_type in ('on_site', 'out_of_town', 'office', 'in_house'));

-- Work v2 time_in: refuse in-house jobs
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

  if v_has_job and v_job.work_type = 'in_house' then
    return jsonb_build_object('status', 'in_house', 'message', 'In-house work: no time-in on the app.');
  end if;

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

-- send_attendance_reminders: skip in_house jobs
create or replace function public.send_attendance_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_today date := public.manila_today();
  r record;
  v_msgs jsonb := '[]'::jsonb;
  v_sent integer := 0;
  clock constant text := 'FMHH12:MI AM';
begin
  for r in
    with first_job as (
      select distinct on (m.person_id) m.person_id, j.client_name, public.manila_at(v_today, j.start_time) as starts
      from public.jobs j
      join public.job_members m on m.job_id = j.id and m.removed_at is null and m.person_id is not null
      join public.profiles p on p.id = m.person_id and p.role in ('technician', 'helper') and p.lifecycle_status = 'active'
      where j.status in ('planned', 'ongoing') and v_today between j.start_date and j.end_date
        and j.work_type <> 'in_house'
      order by m.person_id, j.start_time
    )
    select f.person_id,
      case when v_now < f.starts then 'in_soon' else 'in_now' end as kind,
      case when v_now < f.starts then 'Job starting soon' else 'Time in now' end as title,
      case when v_now < f.starts
        then format('Your job at %s starts at %s. Time in when you arrive.', f.client_name, to_char(f.starts at time zone 'Asia/Manila', clock))
        else format('You''ll be marked late at %s.', to_char((f.starts + interval '15 minutes') at time zone 'Asia/Manila', clock)) end as body,
      'time_in' as button
    from first_job f
    where v_now between f.starts - interval '10 minutes' and f.starts + interval '14 minutes'
      and not exists (select 1 from public.work_days w where w.person_id = f.person_id and w.work_date = v_today)
    union all
    select w.person_id, 'out_late', 'Still working?',
      format('Time out when you leave %s.', coalesce(j.client_name, 'the office')), 'time_out'
    from public.work_days w
    left join public.jobs j on j.id = w.job_id
    where w.work_date = v_today and w.time_out is null
      and v_now >= public.manila_at(w.work_date, coalesce(j.end_time, public.office_day_end())) + interval '30 minutes'
      and not exists (select 1 from public.overtime_requests o where o.work_day_id = w.id and o.status in ('pending', 'approved'))
  loop
    insert into public.attendance_reminders (person_id, work_date, kind) values (r.person_id, v_today, r.kind)
    on conflict do nothing;
    if not found then continue; end if; -- already reminded today
    v_sent := v_sent + 1;
    select v_msgs || coalesce(jsonb_agg(jsonb_build_object(
      'to', t.token, 'title', r.title, 'body', r.body, 'sound', 'default', 'priority', 'high',
      'categoryId', r.button, 'data', jsonb_build_object('kind', r.button || '_reminder'))), '[]'::jsonb)
    into v_msgs
    from public.push_tokens t where t.user_id = r.person_id and t.token like 'ExponentPushToken[%';
  end loop;

  if jsonb_array_length(v_msgs) > 0 then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := v_msgs,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
  return v_sent;
end;
$$;
