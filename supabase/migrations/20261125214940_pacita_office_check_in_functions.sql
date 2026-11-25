-- Brief 10: on-site crews check in at the Pacita office (face check there); time starts on arrival at the site.
-- 4. Function public.office_check_in
create or replace function public.office_check_in(
  p_lat double precision,
  p_lon double precision,
  p_accuracy_m double precision,
  p_mocked boolean,
  p_device_id text,
  p_queued_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.manila_today();
  v_now timestamptz := now();
  v_at timestamptz;
  v_job public.jobs%rowtype;
  v_has_job boolean := false;
  v_office public.office_locations%rowtype;
  v_dist integer;
  v_inside boolean;
  v_id uuid;
  v_existing public.office_check_ins%rowtype;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if public.my_role() not in ('technician', 'helper') then return jsonb_build_object('status', 'not_field_staff'); end if;
  if not public.is_my_phone(p_device_id) then return jsonb_build_object('status', 'other_phone'); end if;

  v_at := v_now;
  if p_queued_at is not null then
    if p_queued_at > v_now + interval '2 minutes' or p_queued_at < v_now - interval '12 hours' then
      return jsonb_build_object('status', 'queued_too_old');
    end if;
    v_at := p_queued_at;
    v_today := (p_queued_at at time zone 'Asia/Manila')::date;
  end if;

  select * into v_existing from public.office_check_ins where person_id = v_uid and work_date = v_today;
  if found then
    return jsonb_build_object('status', 'already', 'check_in_id', v_existing.id, 'checked_in_at', v_existing.checked_in_at);
  end if;

  if exists (select 1 from public.work_days where person_id = v_uid and work_date = v_today) then
    return jsonb_build_object('status', 'already_working');
  end if;

  -- Only for a job today with work_type = 'on_site'
  select j.* into v_job
  from public.jobs j
  where j.status in ('planned', 'ongoing') and v_today between j.start_date and j.end_date
    and j.work_type = 'on_site'
    and exists (select 1 from public.job_members m where m.job_id = j.id and m.person_id = v_uid and m.removed_at is null)
  order by j.start_time limit 1;
  v_has_job := found;

  if not v_has_job then
    return jsonb_build_object('status', 'no_on_site_job');
  end if;

  select * into v_office from public.office_locations where name = 'Pacita HQ' and is_active limit 1;
  if not found then
    return jsonb_build_object('status', 'no_office_location');
  end if;

  v_dist := case when p_lat is null then null else public.meters_between(p_lat, p_lon, v_office.latitude, v_office.longitude) end;
  v_inside := v_dist is not null and v_dist <= v_office.radius_meters and not coalesce(p_mocked, false);

  if not v_inside then
    return jsonb_build_object(
      'status', case when p_lat is null then 'no_gps' when coalesce(p_mocked, false) then 'fake_gps' else 'outside' end,
      'distance_m', v_dist, 'place_name', v_office.name, 'radius_m', v_office.radius_meters
    );
  end if;

  insert into public.office_check_ins (person_id, work_date, checked_in_at, lat, lon, accuracy_m)
  values (v_uid, v_today, v_at, p_lat, p_lon, p_accuracy_m)
  returning id into v_id;

  return jsonb_build_object('status', 'checked_in', 'check_in_id', v_id, 'checked_in_at', v_at);
end;
$$;
revoke all on function public.office_check_in(double precision, double precision, double precision, boolean, text, timestamptz) from public, anon;
grant execute on function public.office_check_in(double precision, double precision, double precision, boolean, text, timestamptz) to authenticated;

-- 5. Function public.record_office_face_check
create or replace function public.record_office_face_check(p_check_in_id uuid, p_selfie_path text, p_score real, p_live boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ci public.office_check_ins%rowtype;
  v_check text;
  v_threshold constant real := 0.6;
begin
  select * into v_ci from public.office_check_ins where id = p_check_in_id and person_id = v_uid;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_ci.face_check is not null then return jsonb_build_object('status', 'already', 'face_check', v_ci.face_check); end if;
  if p_selfie_path is null or p_selfie_path not like v_uid::text || '%' then return jsonb_build_object('status', 'bad_selfie'); end if;

  v_check := case
    when not exists (select 1 from public.face_enrollments e where e.person_id = v_uid) then 'not_enrolled'
    when not coalesce(p_live, false) then 'no_liveness'
    when coalesce(p_score, -1) < v_threshold then 'mismatch'
    else 'match' end;

  update public.office_check_ins set
    face_score = p_score,
    face_check = v_check,
    selfie_path = p_selfie_path
  where id = v_ci.id;

  return jsonb_build_object('status', 'saved', 'face_check', v_check);
end $$;
revoke all on function public.record_office_face_check(uuid, text, real, boolean) from public, anon;
grant execute on function public.record_office_face_check(uuid, text, real, boolean) to authenticated;
