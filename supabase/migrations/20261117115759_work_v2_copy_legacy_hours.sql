-- Work v2 switch-over: copied days get their hours by the new rule (public.work_hours: from the start time when
-- early, to the end time + approved overtime, minus 1 h lunch over 5 h), not the old app's raw total_hours.
-- Old approved overtime asks are linked to the person's work day first, so they count.
-- After every copy run: `select public.copy_legacy_to_work_v2(true); select public.recount_legacy_work_days();`
create or replace function public.recount_legacy_work_days()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.overtime_requests o set work_day_id = w.id
  from public.work_days w
  where o.work_day_id is null and w.person_id = o.technician_id and w.work_date = o.request_date;

  update public.work_days set hours = public.work_hours(id, time_out), updated_at = now()
  where legacy_log_id is not null and time_out is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.recount_legacy_work_days() from public, anon, authenticated;

select public.recount_legacy_work_days();
