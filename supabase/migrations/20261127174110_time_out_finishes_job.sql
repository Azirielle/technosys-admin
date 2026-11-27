-- Time-out and "Job done" merged (Andrew, 28 Nov). On the job's last day the time-out asks "Is the job finished?"
-- (status ask_finished). Yes marks the whole job done for the crew (event 'finished', by that person), so the rest
-- of the crew is not asked again and is not counted early. No signal (a time-out sent later): never asked, the job
-- stays open for the Coordinator. New argument p_job_finished, so the function is replaced (same grants).
drop function if exists public.time_out(double precision, double precision, text, timestamp with time zone, text);

create function public.time_out(p_lat double precision, p_lon double precision, p_device_id text,
  p_queued_at timestamp with time zone default null, p_reason text default null, p_job_finished boolean default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  w public.work_days%rowtype;
  v_job public.jobs%rowtype;
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
  select * into v_job from public.jobs where id = w.job_id;

  -- A driver brings the vehicle back to its home office first (sent later from the phone: saved, HR checks it)
  select o.* into v_vehicle_office
  from public.job_members m join public.vehicles v on v.id = m.vehicle_id join public.office_locations o on o.id = v.home_office_id
  where m.job_id = w.job_id and m.person_id = v_uid and m.removed_at is null and m.vehicle_id is not null;
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

  -- The job's last day and nobody has finished it yet: ask first (not for a time-out sent later)
  if v_job.id is not null and v_job.status in ('planned', 'ongoing') and w.work_date >= v_job.end_date
     and p_job_finished is null and p_queued_at is null then
    return jsonb_build_object('status', 'ask_finished', 'client_name', v_job.client_name);
  end if;
  if p_job_finished and v_job.id is not null and v_job.status in ('planned', 'ongoing') then
    update public.jobs set status = 'done', updated_at = now() where id = v_job.id;
    insert into public.job_events (job_id, kind, person_id, work_day_id, by_id, lat, lon)
    values (v_job.id, 'finished', v_uid, w.id, v_uid, p_lat, p_lon);
    v_job.status := 'done';
  end if;

  -- Early: more than 15 minutes before the end and the job isn't finished (old "Job done" taps still count that day)
  select public.manila_at(w.work_date, coalesce(v_job.end_time, public.office_day_end())) into v_end;
  v_early := greatest(0, floor(extract(epoch from (v_end - v_out)) / 60))::int;
  if v_early <= 15 or v_job.status = 'done'
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
    'minutes_early', v_early, 'job_finished', coalesce(v_job.status = 'done', false));
end;
$function$;

revoke all on function public.time_out(double precision, double precision, text, timestamp with time zone, text, boolean) from public, anon;
grant execute on function public.time_out(double precision, double precision, text, timestamp with time zone, text, boolean) to authenticated, service_role;
