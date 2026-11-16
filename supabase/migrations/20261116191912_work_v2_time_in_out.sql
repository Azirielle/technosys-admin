-- Work v2, part 2: time-in and time-out run inside the database, so every rule is checked on the server
-- (plan: docs/job-workflow-sketch.html). The app sends what it measured; these functions decide.
-- Every result is a plain status the app turns into one sentence: no raw errors for normal situations.
--   time_in            today's job or HQ duty → window → registered phone → location → inside the circle,
--                      or a selfie + reason (needs review). Early counts from the start; late = minutes after start.
--   time_out           anywhere; a driver only inside the vehicle's home office circle. Hours stop at the end
--                      time unless overtime was approved.
--   report_left_at     "I forgot to time out": the person says when they left; HR checks it.
--   coordinator_time_out   the Coordinator (or HR, CEO) times someone out with a reason.
--   mark_job_progress  Arrived / Done at the job.
--   decide_review, set_acting_lead, request_overtime, decide_overtime, mark_no_time_outs (nightly)

-- Distance in meters between two points (haversine)
create or replace function public.meters_between(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns integer language sql immutable set search_path = '' as $$
  select round(6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  )))::integer;
$$;

-- Today in Manila, and a Manila date + clock time as a real moment
create or replace function public.manila_today() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;
create or replace function public.manila_at(d date, t time) returns timestamptz language sql immutable set search_path = '' as $$
  select (d + t) at time zone 'Asia/Manila';
$$;

-- Office duty (no job today) follows the company day: 8:00 AM to 5:00 PM at the nearest office
create or replace function public.office_day_start() returns time language sql immutable set search_path = '' as $$ select time '08:00' $$;
create or replace function public.office_day_end() returns time language sql immutable set search_path = '' as $$ select time '17:00' $$;

-- Hours for a work day if it ended at p_out: from counted_from to the end time (+ approved overtime),
-- minus a 1-hour lunch when over 5 hours. Rounded to 0.1 h.
create or replace function public.work_hours(p_work_day_id uuid, p_out timestamptz)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare
  w public.work_days%rowtype;
  v_end timestamptz;
  v_ot numeric;
  v_to timestamptz;
  v_h numeric;
begin
  select * into w from public.work_days where id = p_work_day_id;
  select public.manila_at(w.work_date, coalesce(j.end_time, public.office_day_end())) into v_end
  from (select 1) x left join public.jobs j on j.id = w.job_id;
  select coalesce(sum(requested_hours), 0) into v_ot from public.overtime_requests
  where work_day_id = w.id and status = 'approved';
  v_to := least(p_out, v_end + make_interval(mins => (v_ot * 60)::int));
  v_h := greatest(0, extract(epoch from (v_to - w.counted_from)) / 3600);
  if v_h > 5 then v_h := v_h - 1; end if;
  return round(v_h, 1);
end;
$$;
revoke execute on function public.work_hours(uuid, timestamptz) from public, anon, authenticated;

-- Is this the person's registered work phone? (field staff only)
create or replace function public.is_my_phone(p_device_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.registered_devices where profile_id = (select auth.uid()) and device_id = p_device_id);
$$;
revoke execute on function public.is_my_phone(text) from public, anon, authenticated;

-- ─── Time in ────────────────────────────────────────────────────────────────────────────────────
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
  v_check text; v_status text;
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

  if not v_inside and p_selfie_path is null then
    return jsonb_build_object(
      'status', case when p_lat is null then 'need_selfie' when coalesce(p_mocked, false) then 'fake_gps' else 'outside' end,
      'distance_m', v_dist, 'place_name', v_place_name, 'place_lat', v_lat, 'place_lon', v_lon, 'radius_m', v_radius);
  end if;
  if not v_inside then
    if length(trim(coalesce(p_reason, ''))) < 3 then return jsonb_build_object('status', 'need_reason'); end if;
    if p_selfie_path not like v_uid::text || '%' then return jsonb_build_object('status', 'bad_selfie'); end if;
  end if;

  v_check := case when not v_inside then 'selfie' when p_queued_at is not null then 'queued' else 'inside' end;
  v_status := case when v_check = 'selfie' then 'needs_review' else 'working' end;
  v_late := greatest(0, floor(extract(epoch from (v_at - v_start)) / 60))::int;

  insert into public.work_days (person_id, work_date, job_id, place, place_name, time_in, counted_from, late_minutes,
    in_lat, in_lon, in_accuracy_m, in_distance_m, in_check, in_reason, selfie_path, is_mocked, device_id, status)
  values (v_uid, v_today, v_job.id, v_place, v_place_name, v_at, greatest(v_at, v_start),
    case when v_late > 15 then v_late else 0 end,
    p_lat, p_lon, p_accuracy_m, v_dist, v_check, case when v_inside then null else trim(p_reason) end,
    case when v_inside then null else p_selfie_path end, coalesce(p_mocked, false), p_device_id, v_status)
  returning id into v_id;

  if v_check = 'selfie' then
    insert into public.reviews (work_day_id, kind, note)
    values (v_id, case when coalesce(p_mocked, false) then 'fake_gps' else 'selfie_time_in' end, trim(p_reason));
  end if;
  if v_has_job and v_job.status = 'planned' then
    update public.jobs set status = 'ongoing', updated_at = now() where id = v_job.id;
  end if;

  return jsonb_build_object('status', 'timed_in', 'work_day_id', v_id, 'check', v_check,
    'late_minutes', case when v_late > 15 then v_late else 0 end, 'place_name', v_place_name, 'counted_from', greatest(v_at, v_start));
end;
$$;
revoke execute on function public.time_in(double precision, double precision, double precision, boolean, text, text, text, boolean, timestamptz) from public, anon;
grant execute on function public.time_in(double precision, double precision, double precision, boolean, text, text, text, boolean, timestamptz) to authenticated;

-- ─── Time out ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.time_out(
  p_lat double precision, p_lon double precision, p_device_id text, p_queued_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  w public.work_days%rowtype;
  v_out timestamptz := coalesce(p_queued_at, now());
  v_vehicle_office public.office_locations%rowtype;
  v_dist integer;
  v_check text;
  v_hours numeric;
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

  -- A driver brings the vehicle back to its home office first
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
  v_hours := public.work_hours(w.id, v_out);
  update public.work_days
  set time_out = v_out, out_lat = p_lat, out_lon = p_lon, out_check = v_check, hours = v_hours,
      status = case when status = 'needs_review' then 'needs_review' else 'done' end, updated_at = now()
  where id = w.id;
  return jsonb_build_object('status', 'timed_out', 'work_day_id', w.id, 'time_out', v_out, 'hours', v_hours, 'check', v_check);
end;
$$;
revoke execute on function public.time_out(double precision, double precision, text, timestamptz) from public, anon;
grant execute on function public.time_out(double precision, double precision, text, timestamptz) to authenticated;

-- ─── Forgot to time out: "I left at …" (HR checks it) ───────────────────────────────────────────
create or replace function public.report_left_at(p_work_day_id uuid, p_left_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.work_days%rowtype; v_hours numeric;
begin
  select * into w from public.work_days where id = p_work_day_id and person_id = auth.uid() for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if w.time_out is not null then return jsonb_build_object('status', 'already_closed'); end if;
  if p_left_at <= w.time_in or p_left_at > w.time_in + interval '24 hours' or p_left_at > now() then
    return jsonb_build_object('status', 'bad_time');
  end if;
  v_hours := public.work_hours(w.id, p_left_at);
  update public.work_days set time_out = p_left_at, out_check = 'told_later', hours = v_hours, status = 'needs_review', updated_at = now()
  where id = w.id;
  insert into public.reviews (work_day_id, kind, note) values (w.id, 'told_later', 'Person reported the time they left.');
  return jsonb_build_object('status', 'saved', 'hours', v_hours);
end;
$$;
revoke execute on function public.report_left_at(uuid, timestamptz) from public, anon;
grant execute on function public.report_left_at(uuid, timestamptz) to authenticated;

-- ─── The Coordinator (or HR, CEO) times someone out ─────────────────────────────────────────────
create or replace function public.coordinator_time_out(p_work_day_id uuid, p_time_out timestamptz, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.work_days%rowtype; v_hours numeric;
begin
  if public.my_role() not in ('coordinator', 'hr', 'ceo') then raise exception 'Office staff only'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then return jsonb_build_object('status', 'need_reason'); end if;
  select * into w from public.work_days where id = p_work_day_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if w.time_out is not null then return jsonb_build_object('status', 'already_closed'); end if;
  if p_time_out <= w.time_in or p_time_out > now() then return jsonb_build_object('status', 'bad_time'); end if;
  v_hours := public.work_hours(w.id, p_time_out);
  update public.work_days set time_out = p_time_out, out_check = 'by_coordinator', hours = v_hours, status = 'needs_review', updated_at = now()
  where id = w.id;
  insert into public.reviews (work_day_id, kind, note) values (w.id, 'coordinator_time_out', trim(p_reason));
  return jsonb_build_object('status', 'saved', 'hours', v_hours);
end;
$$;
revoke execute on function public.coordinator_time_out(uuid, timestamptz, text) from public, anon;
grant execute on function public.coordinator_time_out(uuid, timestamptz, text) to authenticated;

-- ─── Arrived / Done at the job ──────────────────────────────────────────────────────────────────
create or replace function public.mark_job_progress(p_job_id uuid, p_kind text, p_lat double precision, p_lon double precision)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wd uuid; v_job public.jobs%rowtype;
begin
  if p_kind not in ('arrived', 'done') then raise exception 'Unknown step'; end if;
  if not public.is_on_job(p_job_id) then return jsonb_build_object('status', 'not_on_job'); end if;
  select id into v_wd from public.work_days where person_id = auth.uid() and work_date = public.manila_today() and time_out is null;
  if v_wd is null then return jsonb_build_object('status', 'not_timed_in'); end if;
  if exists (select 1 from public.job_events where job_id = p_job_id and work_day_id = v_wd and kind = p_kind) then
    return jsonb_build_object('status', 'already');
  end if;
  select * into v_job from public.jobs where id = p_job_id;
  insert into public.job_events (job_id, kind, person_id, work_day_id, by_id, lat, lon, details)
  values (p_job_id, p_kind, auth.uid(), v_wd, auth.uid(), p_lat, p_lon,
    jsonb_build_object('distance_m', case when p_lat is null then null else public.meters_between(p_lat, p_lon, v_job.site_lat, v_job.site_lon) end));
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke execute on function public.mark_job_progress(uuid, text, double precision, double precision) from public, anon;
grant execute on function public.mark_job_progress(uuid, text, double precision, double precision) to authenticated;

-- ─── Reviews: approve or decline (fake GPS needs HR or the CEO) ─────────────────────────────────
create or replace function public.decide_review(p_review_id uuid, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.reviews%rowtype; v_role text := public.my_role();
begin
  if v_role not in ('coordinator', 'hr', 'ceo') then raise exception 'Office staff only'; end if;
  select * into r from public.reviews where id = p_review_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if r.status <> 'pending' then return jsonb_build_object('status', 'already_decided'); end if;
  if r.kind = 'fake_gps' and v_role = 'coordinator' then return jsonb_build_object('status', 'hr_only'); end if;
  if not p_approve and length(trim(coalesce(p_note, ''))) < 5 then return jsonb_build_object('status', 'need_reason'); end if;
  update public.reviews set status = case when p_approve then 'approved' else 'declined' end,
    note = coalesce(nullif(trim(p_note), ''), note), decided_by = auth.uid(), decided_at = now()
  where id = r.id;
  -- With nothing left to check, the day goes back to working / done
  if not exists (select 1 from public.reviews where work_day_id = r.work_day_id and status = 'pending') then
    update public.work_days set status = case when time_out is null then 'working' else 'done' end, updated_at = now()
    where id = r.work_day_id and status = 'needs_review';
  end if;
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke execute on function public.decide_review(uuid, boolean, text) from public, anon;
grant execute on function public.decide_review(uuid, boolean, text) to authenticated;

-- ─── Absent lead: the Coordinator names an acting lead from the crew ────────────────────────────
create or replace function public.set_acting_lead(p_job_id uuid, p_person_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() not in ('coordinator', 'ceo') then raise exception 'Coordinator only'; end if;
  if not exists (
    select 1 from public.job_members m join public.profiles p on p.id = m.person_id
    where m.job_id = p_job_id and m.person_id = p_person_id and m.removed_at is null and p.role = 'technician'
  ) then return jsonb_build_object('status', 'not_eligible'); end if;
  update public.job_members set is_acting_lead = (person_id = p_person_id) where job_id = p_job_id and removed_at is null;
  insert into public.job_events (job_id, kind, person_id, by_id, reason) values (p_job_id, 'acting_lead', p_person_id, auth.uid(), 'Lead absent');
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke execute on function public.set_acting_lead(uuid, uuid) from public, anon;
grant execute on function public.set_acting_lead(uuid, uuid) to authenticated;

-- ─── Overtime: asked from the app for today, approved by the Coordinator ────────────────────────
create or replace function public.request_overtime(p_hours numeric, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w public.work_days%rowtype; v_id uuid;
begin
  if p_hours is null or p_hours <= 0 or p_hours > 8 then return jsonb_build_object('status', 'bad_hours'); end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then return jsonb_build_object('status', 'need_reason'); end if;
  select * into w from public.work_days where person_id = auth.uid() and work_date = public.manila_today();
  if not found then return jsonb_build_object('status', 'not_timed_in'); end if;
  if exists (select 1 from public.overtime_requests where work_day_id = w.id and status = 'pending') then
    return jsonb_build_object('status', 'already_asked');
  end if;
  insert into public.overtime_requests (technician_id, request_date, requested_hours, reason, status, work_day_id)
  values (auth.uid(), w.work_date, round(p_hours, 1), trim(p_reason), 'pending', w.id) returning id into v_id;
  return jsonb_build_object('status', 'saved', 'id', v_id);
end;
$$;
revoke execute on function public.request_overtime(numeric, text) from public, anon;
grant execute on function public.request_overtime(numeric, text) to authenticated;

create or replace function public.decide_overtime(p_request_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.overtime_requests%rowtype;
begin
  if public.my_role() not in ('coordinator', 'hr', 'ceo') then raise exception 'Office staff only'; end if;
  select * into r from public.overtime_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  update public.overtime_requests set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now() where id = r.id;
  -- Already timed out: recount the hours with (or without) the overtime
  update public.work_days set hours = public.work_hours(id, time_out), updated_at = now()
  where id = r.work_day_id and time_out is not null;
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke execute on function public.decide_overtime(uuid, boolean) from public, anon;
grant execute on function public.decide_overtime(uuid, boolean) to authenticated;

-- ─── Nightly: shifts still open at 11:59 PM (Manila) become "no time-out" ───────────────────────
create or replace function public.mark_no_time_outs()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  with marked as (
    update public.work_days set status = 'no_time_out', updated_at = now()
    where time_out is null and status in ('working', 'needs_review') and work_date <= public.manila_today()
    returning id
  ), reviewed as (
    insert into public.reviews (work_day_id, kind, note) select id, 'no_time_out', 'Still timed in at 11:59 PM.' from marked
    returning 1
  )
  select count(*) into v_n from reviewed;
  return v_n;
end;
$$;
revoke execute on function public.mark_no_time_outs() from public, anon, authenticated;

select cron.schedule('work-v2-no-time-outs', '59 15 * * *', $$select public.mark_no_time_outs()$$);  -- 11:59 PM Manila
