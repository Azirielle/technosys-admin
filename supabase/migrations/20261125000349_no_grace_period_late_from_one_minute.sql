-- No grace period (client interview, Nov 2026: "1 minute, late na 'yon. Dati mayroon, tinanggal"; CONSULTATION_FIXES B1).
-- Late now counts from the first minute after the start, not after 15 minutes. Only the grace lines of these functions
-- change; each must be found exactly as expected or nothing is changed.
do $$
declare
  f record;
  def text;
begin
  for f in select * from (values
    ('public.time_in(double precision,double precision,double precision,boolean,text,text,text,boolean,timestamp with time zone)', 'v_late > 15', 'v_late > 0', 2),
    ('public.hr_correct_work_day(uuid,uuid,date,timestamp with time zone,timestamp with time zone,text)', 'v_late > 15', 'v_late > 0', 2),
    ('public.copy_legacy_to_work_v2(boolean)', '/ 60 > 15 then', '/ 60 > 0 then', 1),
    ('public.send_attendance_reminders()', 'f.starts + interval ''15 minutes''', 'f.starts + interval ''1 minute''', 1)
  ) as v(fn, old, new, n)
  loop
    def := pg_get_functiondef(f.fn::regprocedure);
    if (length(def) - length(replace(def, f.old, ''))) / length(f.old) <> f.n then
      raise exception '% changed: expected % of "%"', f.fn, f.n, f.old;
    end if;
    execute replace(def, f.old, f.new);
  end loop;
end $$;
