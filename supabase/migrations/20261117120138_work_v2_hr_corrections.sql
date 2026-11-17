-- Work v2: HR's DTR corrections change work_days. Each correction is still recorded in attendance_corrections
-- (before, after, who, why), now linked by work_day_id. hr_correct_work_day updates the day, or adds a missing
-- day, recounts late minutes and hours by the Work v2 rules, and closes that day's open reviews.
alter table public.attendance_corrections add column work_day_id uuid references public.work_days(id) on delete set null;
create index attendance_corrections_work_day_idx on public.attendance_corrections (work_day_id);

create or replace function public.hr_correct_work_day(
  p_work_day_id uuid, p_person_id uuid, p_date date, p_time_in timestamptz, p_time_out timestamptz, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  w public.work_days%rowtype;
  v_role text := public.my_role();
  v_start timestamptz;
  v_late int;
  v_id uuid;
  v_hq public.office_locations%rowtype;
  v_type text := 'update_punch';
begin
  if v_role not in ('hr', 'ceo') then raise exception 'HR only'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then return jsonb_build_object('status', 'need_reason'); end if;
  if p_time_out <= p_time_in then return jsonb_build_object('status', 'bad_time'); end if;

  if p_work_day_id is not null then
    select * into w from public.work_days where id = p_work_day_id for update;
    if not found then return jsonb_build_object('status', 'not_found'); end if;
  else
    select * into w from public.work_days where person_id = p_person_id and work_date = p_date for update;
  end if;

  -- The job start that day (or the office day) decides early / late
  select public.manila_at(p_date, coalesce(j.start_time, public.office_day_start())) into v_start
  from (select 1) x left join lateral (
    select j.start_time from public.jobs j join public.job_members m on m.job_id = j.id
    where m.person_id = coalesce(w.person_id, p_person_id) and m.removed_at is null and j.status <> 'cancelled'
      and p_date between j.start_date and j.end_date order by j.start_time limit 1
  ) j on true;
  v_late := greatest(0, floor(extract(epoch from (p_time_in - v_start)) / 60))::int;

  if w.id is not null then
    v_id := w.id;
    update public.work_days set time_in = p_time_in, counted_from = greatest(p_time_in, v_start),
      late_minutes = case when v_late > 15 then v_late else 0 end, time_out = p_time_out, status = 'done', updated_at = now()
    where id = v_id;
  else
    v_type := 'insert_missing_shift';
    select * into v_hq from public.office_locations where is_active order by created_at limit 1;
    insert into public.work_days (person_id, work_date, place, place_name, time_in, counted_from, late_minutes, in_check, in_reason, time_out, out_check, status)
    values (p_person_id, p_date, 'hq', v_hq.name, p_time_in, greatest(p_time_in, v_start), case when v_late > 15 then v_late else 0 end,
      'inside', 'Added by HR', p_time_out, 'by_coordinator', 'done')
    returning id into v_id;
  end if;
  update public.work_days set hours = public.work_hours(v_id, p_time_out) where id = v_id;

  update public.reviews set status = 'approved', decided_by = auth.uid(), decided_at = now(),
    note = coalesce(note, '') || ' Closed: corrected by HR.'
  where work_day_id = v_id and status = 'pending';

  insert into public.attendance_corrections (work_day_id, technician_id, target_date, correction_type, original_time_in, original_time_out,
    corrected_time_in, corrected_time_out, reason, corrected_by, actor_role)
  values (v_id, coalesce(w.person_id, p_person_id), p_date, v_type, w.time_in, w.time_out, p_time_in, p_time_out, trim(p_reason), auth.uid(), v_role);

  return jsonb_build_object('status', 'saved', 'work_day_id', v_id, 'hours', (select hours from public.work_days where id = v_id));
end;
$$;
revoke execute on function public.hr_correct_work_day(uuid, uuid, date, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.hr_correct_work_day(uuid, uuid, date, timestamptz, timestamptz, text) to authenticated;
