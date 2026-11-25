-- Verified selfie on every time-in (CONSULTATION_FIXES B15, 25 Nov): the phone compares a live selfie with the face the
-- person enrolled (MobileFaceNet on the phone, 128 numbers) and sends the score. A low score or a failed blink / head turn
-- never blocks the time-in: the day is marked "Face mismatch - needs review" for HR.

-- 1. Enrollment: one face per person, taken on their phone at setup. HR can reset it (they enroll again on the next time-in).
create table public.face_enrollments (
  person_id uuid primary key references public.profiles(id) on delete cascade,
  embedding real[] not null check (array_length(embedding, 1) = 128),
  photo_path text not null check (length(photo_path) between 5 and 200),
  enrolled_at timestamptz not null default now()
);
alter table public.face_enrollments enable row level security;
create policy "own face, or hr and ceo (see)" on public.face_enrollments for select to authenticated
  using (person_id = (select auth.uid()) or (select public.my_role()) in ('hr', 'ceo'));
create policy "own face (enroll)" on public.face_enrollments for insert to authenticated
  with check (person_id = (select auth.uid()) and photo_path like (select auth.uid())::text || '%');
create policy "hr resets a face" on public.face_enrollments for delete to authenticated
  using ((select public.my_role()) in ('hr', 'ceo'));

-- 2. The result on the work day. face_check: match / mismatch / no_liveness / not_enrolled; empty = no face step
--    (an older phone, or a day HR entered by hand).
alter table public.work_days
  add column face_score real check (face_score between -1 and 1),
  add column face_check text check (face_check in ('match', 'mismatch', 'no_liveness', 'not_enrolled'));

-- 3. Called by the phone right after time_in answers "timed_in" (online, or when a saved punch is sent).
create or replace function public.record_face_check(p_work_day_id uuid, p_selfie_path text, p_score real, p_live boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day public.work_days;
  v_check text;
  v_threshold constant real := 0.6; -- similarity needed to count as the same person; tune after testing
begin
  select * into v_day from public.work_days where id = p_work_day_id and person_id = v_uid;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_day.face_check is not null then return jsonb_build_object('status', 'already', 'face_check', v_day.face_check); end if;
  if p_selfie_path is null or p_selfie_path not like v_uid::text || '%' then return jsonb_build_object('status', 'bad_selfie'); end if;

  v_check := case
    when not exists (select 1 from public.face_enrollments e where e.person_id = v_uid) then 'not_enrolled'
    when not coalesce(p_live, false) then 'no_liveness'
    when coalesce(p_score, -1) < v_threshold then 'mismatch'
    else 'match' end;

  update public.work_days set
    face_score = p_score, face_check = v_check,
    selfie_path = coalesce(selfie_path, p_selfie_path),
    status = case when v_check in ('mismatch', 'no_liveness') and status = 'working' then 'needs_review' else status end,
    in_reason = case when v_check in ('mismatch', 'no_liveness')
      then concat_ws('; ', nullif(in_reason, ''), case v_check when 'mismatch' then 'Face mismatch - needs review' else 'No blink or head turn - needs review' end)
      else in_reason end,
    updated_at = now()
  where id = v_day.id;
  return jsonb_build_object('status', 'saved', 'face_check', v_check);
end $$;
revoke all on function public.record_face_check(uuid, text, real, boolean) from public, anon;
grant execute on function public.record_face_check(uuid, text, real, boolean) to authenticated;
