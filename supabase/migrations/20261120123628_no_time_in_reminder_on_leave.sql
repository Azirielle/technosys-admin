-- No "Job starting soon" / "Time in now" push for someone on approved leave that day (20 Nov). The reminder only
-- checked the job's crew, so a person on leave who was still on a crew got told to time in. Only that line is added.
do $$
declare
  def text := pg_get_functiondef('public.send_attendance_reminders()'::regprocedure);
  anchor text := 'and not exists (select 1 from public.work_days w where w.person_id = f.person_id and w.work_date = v_today)';
begin
  if position(anchor in def) = 0 then raise exception 'send_attendance_reminders changed: anchor not found'; end if;
  execute replace(def, anchor, anchor || E'\n      and not exists (select 1 from public.leaves l where l.technician_id = f.person_id and l.status = ''approved'' and v_today between l.start_date and l.end_date)');
end $$;
