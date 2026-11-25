-- Brief 10: on-site crews check in at the Pacita office (face check there); time starts on arrival at the site.
-- 6. Patch public.time_in in place to inherit office check-in face results and calculate late from office check-in
do $$
declare
  def text := pg_get_functiondef('public.time_in(double precision,double precision,double precision,boolean,text,text,text,boolean,timestamp with time zone)'::regprocedure);
  a_decl constant text := E'  v_id uuid;\n  v_late integer;';
  a_late constant text := E'  v_late := greatest(0, floor(extract(epoch from (v_at - v_start)) / 60))::int;';
  a_ins constant text := E'  insert into public.work_days (person_id, work_date, job_id, place, place_name, time_in, counted_from, late_minutes,\n    in_lat, in_lon, in_accuracy_m, in_distance_m, in_check, in_reason, selfie_path, is_mocked, device_id, status)\n  values (v_uid, v_today, v_job.id, v_place, v_place_name, v_at, greatest(v_at, v_start),\n    case when v_late > 0 then v_late else 0 end,\n    p_lat, p_lon, p_accuracy_m, v_dist, v_check, v_reason,\n    case when v_inside then null else p_selfie_path end, coalesce(p_mocked, false), p_device_id, v_status)\n  returning id into v_id;';
  a_ret constant text := E'  return jsonb_build_object(\'status\', \'timed_in\', \'work_day_id\', v_id, \'check\', v_check,\n    \'late_minutes\', case when v_late > 0 then v_late else 0 end, \'place_name\', v_place_name, \'counted_from\', greatest(v_at, v_start));';

  r_decl constant text := E'  v_id uuid;\n  v_late integer;\n  v_office public.office_check_ins%rowtype;\n  v_has_office boolean := false;';
  r_late constant text := E'  select * into v_office from public.office_check_ins where person_id = v_uid and work_date = v_today;\n  v_has_office := found;\n  v_late := greatest(0, floor(extract(epoch from (case when v_has_office then v_office.checked_in_at else v_at end - v_start)) / 60))::int;';
  r_ins constant text := E'  if v_has_office and v_office.face_check in (\'mismatch\', \'no_liveness\') and v_status = \'working\' then\n    v_status := \'needs_review\';\n  end if;\n\n  insert into public.work_days (person_id, work_date, job_id, place, place_name, time_in, counted_from, late_minutes,\n    in_lat, in_lon, in_accuracy_m, in_distance_m, in_check, in_reason, selfie_path, is_mocked, device_id, status, face_score, face_check)\n  values (v_uid, v_today, v_job.id, v_place, v_place_name, v_at, greatest(v_at, v_start),\n    case when v_late > 0 then v_late else 0 end,\n    p_lat, p_lon, p_accuracy_m, v_dist, v_check, v_reason,\n    case when v_has_office then v_office.selfie_path when v_inside then null else p_selfie_path end,\n    coalesce(p_mocked, false), p_device_id, v_status,\n    case when v_has_office then v_office.face_score else null end,\n    case when v_has_office then v_office.face_check else null end)\n  returning id into v_id;\n\n  if v_has_office and v_office.face_check in (\'mismatch\', \'no_liveness\') then\n    insert into public.reviews (work_day_id, kind, note)\n    values (v_id, \'face_mismatch\', case v_office.face_check when \'mismatch\'\n      then format(\'Face mismatch - needs review (match %s%%)\', round(coalesce(v_office.face_score, 0) * 100))\n      else \'No blink or head turn - needs review\' end);\n  end if;';
  r_ret constant text := E'  return jsonb_build_object(\'status\', \'timed_in\', \'work_day_id\', v_id, \'check\', v_check,\n    \'late_minutes\', case when v_late > 0 then v_late else 0 end, \'place_name\', v_place_name, \'counted_from\', greatest(v_at, v_start),\n    \'face_already_checked\', v_has_office);';
begin
  if position(a_decl in def) = 0 then raise exception 'time_in: a_decl not found'; end if;
  if position(a_late in def) = 0 then raise exception 'time_in: a_late not found'; end if;
  if position(a_ins in def) = 0 then raise exception 'time_in: a_ins not found'; end if;
  if position(a_ret in def) = 0 then raise exception 'time_in: a_ret not found'; end if;

  def := replace(def, a_decl, r_decl);
  def := replace(def, a_late, r_late);
  def := replace(def, a_ins, r_ins);
  def := replace(def, a_ret, r_ret);

  execute def;
end $$;
