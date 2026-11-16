-- Work v2: when the Coordinator times someone out, their open "no time-out" review is closed with a note,
-- so HR checks one item (the Coordinator's time-out, with its reason) instead of two.
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
  update public.reviews set status = 'approved', decided_by = auth.uid(), decided_at = now(),
    note = coalesce(note, '') || ' Closed: timed out by the office.'
  where work_day_id = w.id and kind = 'no_time_out' and status = 'pending';
  insert into public.reviews (work_day_id, kind, note) values (w.id, 'coordinator_time_out', trim(p_reason));
  return jsonb_build_object('status', 'saved', 'hours', v_hours);
end;
$$;
