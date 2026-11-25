-- B15 follow-up: a face mismatch (or no blink / head turn) also goes into HR's review list (Today → reviews), like a
-- selfie time-in, so HR sees it without opening the DTR. Kind 'face_mismatch'.
alter table public.reviews drop constraint reviews_kind_check;
alter table public.reviews add constraint reviews_kind_check check (kind in ('selfie_time_in', 'fake_gps', 'no_time_out',
  'told_later', 'coordinator_time_out', 'driver_away', 'early_time_out', 'offline_time_in', 'face_mismatch'));

do $$
declare def text := pg_get_functiondef('public.record_face_check(uuid,text,real,boolean)'::regprocedure);
begin
  if position('  return jsonb_build_object(''status'', ''saved''' in def) = 0 then raise exception 'record_face_check changed'; end if;
  execute replace(def, '  return jsonb_build_object(''status'', ''saved''',
    '  if v_check in (''mismatch'', ''no_liveness'') then
    insert into public.reviews (work_day_id, kind, note)
    values (v_day.id, ''face_mismatch'', case v_check when ''mismatch'' then format(''Face mismatch - needs review (match %s%%)'', round(coalesce(p_score, 0) * 100))
      else ''No blink or head turn - needs review'' end);
  end if;
  return jsonb_build_object(''status'', ''saved''');
end $$;
