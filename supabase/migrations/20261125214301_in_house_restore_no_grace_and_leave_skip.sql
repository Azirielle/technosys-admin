-- 20261125211341_in_house_work copied time_in and send_attendance_reminders from older migration files, which
-- undid two later in-place patches: no grace period (20261125000349: late from the 1st minute) and no reminder for
-- people on approved leave (20261120123628). This puts both back, in place, keeping the in-house lines.
do $$
declare
  def text := pg_get_functiondef('public.time_in(double precision,double precision,double precision,boolean,text,text,text,boolean,timestamp with time zone)'::regprocedure);
begin
  if (length(def) - length(replace(def, 'v_late > 15', ''))) / length('v_late > 15') <> 2 then raise exception 'time_in changed: expected 2 grace lines'; end if;
  execute replace(def, 'v_late > 15', 'v_late > 0');
end $$;

do $$
declare
  def text := pg_get_functiondef('public.send_attendance_reminders()'::regprocedure);
  anchor text := 'and not exists (select 1 from public.work_days w where w.person_id = f.person_id and w.work_date = v_today)';
begin
  if position(anchor in def) = 0 then raise exception 'send_attendance_reminders changed: anchor not found'; end if;
  if position('public.leaves' in def) > 0 then raise exception 'leave skip already there'; end if;
  execute replace(def, anchor, anchor || E'\n      and not exists (select 1 from public.leaves l where l.technician_id = f.person_id and l.status = ''approved'' and v_today between l.start_date and l.end_date)');
end $$;
