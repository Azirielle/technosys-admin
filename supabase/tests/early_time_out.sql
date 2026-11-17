-- Test for the early time-out rule in public.time_out (migrations 20261117181822 and 20261117185216).
-- How to run: paste the whole file into the Supabase SQL editor and run it. It ends with ROLLBACK, so nothing is kept.
-- Uses Ramon Santos (demo data) with his registered phone. His work day today is replaced inside the test only.
-- Expected result, one line per case:
--   1 early, no reason      → early        (asks why, nothing saved)
--   2 early, with reason    → timed_out    · needs_review · early_time_out review
--   3 offline, no reason    → timed_out    · needs_review · review "no reason given"
--   4 job marked Done       → timed_out    · done · no review
--   5 Job done pressed today → timed_out   · done · no review
--   6 Job done yesterday    → early

begin;
create temp table t_out (step text, result jsonb, day_status text, review text) on commit drop;
grant all on t_out to authenticated;

create temp table t_ids on commit drop as
select p.id as person_id, r.device_id from public.profiles p join public.registered_devices r on r.profile_id = p.id
where p.full_name = 'Ramon Santos';
grant select on t_ids to authenticated;

with j as (insert into public.jobs (client_name, address, site_lat, site_lon, start_date, end_date, start_time, end_time)
  values ('ROLLBACK test', 'x', 14.3439, 121.0617, public.manila_today() - 1, public.manila_today(),
          ((now() at time zone 'Asia/Manila') - interval '1 hour')::time, ((now() at time zone 'Asia/Manila') + interval '2 hours')::time)
  returning id)
insert into public.job_members (job_id, role, person_id) select j.id, 'lead', t.person_id from j, t_ids t;

-- A fresh, open work day timed in an hour ago (the job ends in 2 hours)
create or replace function pg_temp.fresh_day() returns void language sql as $$
  delete from public.reviews where work_day_id in (select id from public.work_days where person_id = (select person_id from t_ids) and work_date = public.manila_today());
  delete from public.work_days where person_id = (select person_id from t_ids) and work_date = public.manila_today();
  insert into public.work_days (person_id, work_date, job_id, place, place_name, time_in, counted_from, in_lat, in_lon, in_check, device_id, status)
  select t.person_id, public.manila_today(), (select id from public.jobs where client_name = 'ROLLBACK test'), 'site', 'x',
    now() - interval '1 hour', now() - interval '1 hour', 14.3439, 121.0617, 'inside', t.device_id, 'working' from t_ids t;
$$;
create or replace function pg_temp.note(p_step text) returns void language sql as $$
  update t_out set
    day_status = (select status from public.work_days where person_id = (select person_id from t_ids) and work_date = public.manila_today()),
    review = coalesce((select r.kind || ': ' || r.note from public.reviews r join public.work_days w on w.id = r.work_day_id
                       where w.person_id = (select person_id from t_ids) and w.work_date = public.manila_today()), 'none')
  where step = p_step;
$$;

select set_config('request.jwt.claims', json_build_object('sub', (select person_id from t_ids), 'role', 'authenticated')::text, true);

select pg_temp.fresh_day();
set local role authenticated;
insert into t_out (step, result) select '1 early, no reason', public.time_out(14.3439, 121.0617, (select device_id from t_ids));
insert into t_out (step, result) select '2 early, with reason', public.time_out(14.3439, 121.0617, (select device_id from t_ids), null, 'Job finished early');
reset role;
select pg_temp.note('2 early, with reason');

select pg_temp.fresh_day();
set local role authenticated;
insert into t_out (step, result) select '3 offline, no reason', public.time_out(14.3439, 121.0617, (select device_id from t_ids), now() - interval '1 minute');
reset role;
select pg_temp.note('3 offline, no reason');

select pg_temp.fresh_day();
update public.jobs set status = 'done' where client_name = 'ROLLBACK test';
set local role authenticated;
insert into t_out (step, result) select '4 job marked Done', public.time_out(14.3439, 121.0617, (select device_id from t_ids));
reset role;
select pg_temp.note('4 job marked Done');
update public.jobs set status = 'ongoing' where client_name = 'ROLLBACK test';

select pg_temp.fresh_day();
insert into public.job_events (job_id, kind, person_id, at) select id, 'done', (select person_id from t_ids), now() - interval '1 day' from public.jobs where client_name = 'ROLLBACK test';
set local role authenticated;
insert into t_out (step, result) select '6 Job done yesterday', public.time_out(14.3439, 121.0617, (select device_id from t_ids));
reset role;

insert into public.job_events (job_id, kind, person_id, at) select id, 'done', (select person_id from t_ids), now() from public.jobs where client_name = 'ROLLBACK test';
set local role authenticated;
insert into t_out (step, result) select '5 Job done pressed today', public.time_out(14.3439, 121.0617, (select device_id from t_ids));
reset role;
select pg_temp.note('5 Job done pressed today');

select step, result ->> 'status' as status, result ->> 'minutes_early' as minutes_early, day_status, review from t_out order by step;
rollback;
