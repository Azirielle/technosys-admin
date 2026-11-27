-- Round 6: a time-in whose face check found no face (or no head turns) went through silently. Now the phone calls this
-- and the work day is flagged for the Coordinator (Today -> To approve), like a face mismatch. Only for your own day.
create or replace function public.flag_no_face_check(p_work_day_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  w public.work_days;
begin
  select * into w from public.work_days where id = p_work_day_id and person_id = (select auth.uid());
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if w.face_check is not null then return jsonb_build_object('status', 'already'); end if;
  update public.work_days set face_check = 'no_liveness', status = case when status = 'working' then 'needs_review' else status end
    where id = w.id;
  insert into public.reviews (work_day_id, kind, note)
    values (w.id, 'face_mismatch', 'No face check: no face was found or the head turns were missing - needs review');
  return jsonb_build_object('status', 'flagged');
end $$;
revoke all on function public.flag_no_face_check(uuid) from public, anon;
grant execute on function public.flag_no_face_check(uuid) to authenticated;
