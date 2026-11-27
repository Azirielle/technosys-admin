-- No "office" kind of work (Andrew, 27 Nov): only on-site, out-of-town (VIP = an on-site job with is_vip) and in-house.
-- 1. The one office job ("Shop work: duct fabrication", demo data) is shop work at HQ, so it becomes in-house.
-- 2. work_type allows only the three kinds.
-- 3. time_in: no job today always answers "no_job" (the office-duty way in is gone; p_office_duty is kept but ignored
--    so older phones still call the same function). Patched in place.
-- 4. copy_legacy_to_work_v2 (demo data): old "office_duty" schedules become in-house jobs. Patched in place.
update public.jobs set work_type = 'in_house', report_to = 'site' where work_type = 'office';

alter table public.jobs drop constraint if exists jobs_work_type_check;
alter table public.jobs add constraint jobs_work_type_check check (work_type in ('on_site', 'out_of_town', 'in_house'));

do $$
declare
  v_def text;
  r_old constant text := $q$if not v_has_job and not p_office_duty then return jsonb_build_object('status', 'no_job'); end if;$q$;
  r_new constant text := $q$if not v_has_job then return jsonb_build_object('status', 'no_job'); end if; -- no office duty (27 Nov)$q$;
  c_old constant text := $q$when 'office_duty' then 'office' else 'on_site' end$q$;
  c_new constant text := $q$when 'office_duty' then 'in_house' else 'on_site' end$q$;
begin
  v_def := pg_get_functiondef('public.time_in(double precision, double precision, double precision, boolean, text, text, text, boolean, timestamp with time zone)'::regprocedure);
  if position(r_old in v_def) = 0 then raise exception 'time_in: office-duty line not found'; end if;
  execute replace(v_def, r_old, r_new);

  v_def := pg_get_functiondef('public.copy_legacy_to_work_v2(boolean)'::regprocedure);
  if position(c_old in v_def) = 0 then raise exception 'copy_legacy_to_work_v2: office mapping not found'; end if;
  execute replace(v_def, c_old, c_new);
end $$;
