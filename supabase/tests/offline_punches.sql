-- Test: punches saved on the phone with no signal are kept when sent later (migration work_v2_offline_punches_never_lost).
-- How to run: paste the whole file into the Supabase SQL editor and run it. It ends with ROLLBACK, so nothing is kept.
-- Uses Ramon Santos (demo data) with his registered phone; his days and other jobs are changed inside the test only.
-- Expected result, one line per case:
--   1 online, no GPS          → need_selfie   (unchanged: the phone asks for a selfie)
--   2 offline, no GPS         → timed_in · needs_review · offline_time_in
--   3 offline, 8 km away      → timed_in · needs_review · offline_time_in (with the distance)
--   4 offline, inside         → timed_in · working · none
--   5 driver online, away     → bring_vehicle_back (unchanged)
--   6 driver offline, no GPS  → timed_out · needs_review · driver_away

begin;
create temp table t_out (step text, result jsonb, day_status text, review text) on commit drop;
grant all on t_out to authenticated;

create temp table t_ids on commit drop as
select p.id as person_id, r.device_id from public.profiles p join public.registered_devices r on r.profile_id = p.id
where p.full_name = 'Ramon Santos';
grant select on t_ids to authenticated;

-- Only the test job today (a site ~16 km from Pacita HQ): Ramon leaves his other jobs, and his open days are cleared
update public.job_members set removed_at = now() where person_id = (select person_id from t_ids) and removed_at is null;
with j as (insert into public.jobs (client_name, address, site_lat, site_lon, start_date, end_date, start_time, end_time)
  values ('ROLLBACK test', 'x', 14.2000, 121.1000, public.manila_today(), public.manila_today(),
          ((now() at time zone 'Asia/Manila') - interval '30 minutes')::time, ((now() at time zone 'Asia/Manila') + interval '3 hours')::time)
  returning id)
insert into public.job_members (job_id, role, person_id) select j.id, 'lead', t.person_id from j, t_ids t;

create or replace function pg_temp.clear_days() returns void language sql as $$
  delete from public.reviews where work_day_id in (select id from public.work_days where person_id = (select person_id from t_ids)
    and (time_out is null or work_date = public.manila_today()));
  delete from public.work_days where person_id = (select person_id from t_ids) and (time_out is null or work_date = public.manila_today());
$$;
create or replace function pg_temp.note(p_step text) returns void language sql as $$
  update t_out set
    day_status = (select status from public.work_days where person_id = (select person_id from t_ids) and work_date = public.manila_today()),
    review = coalesce((select string_agg(r.kind || ': ' || r.note, ' | ') from public.reviews r join public.work_days w on w.id = r.work_day_id
                       where w.person_id = (select person_id from t_ids) and w.work_date = public.manila_today()), 'none')
  where step = p_step;
$$;

select set_config('request.jwt.claims', json_build_object('sub', (select person_id from t_ids), 'role', 'authenticated')::text, true);

-- time_in(lat, lon, accuracy, mocked, device, selfie, reason, office_duty, queued_at)
select pg_temp.clear_days();
set local role authenticated;
insert into t_out (step, result) select '1 online, no GPS', public.time_in(null, null, null, false, (select device_id from t_ids));
insert into t_out (step, result) select '2 offline, no GPS', public.time_in(null, null, null, false, (select device_id from t_ids), null, null, false, now() - interval '5 minutes');
reset role;
select pg_temp.note('2 offline, no GPS');

select pg_temp.clear_days();
set local role authenticated;
insert into t_out (step, result) select '3 offline, 8 km away', public.time_in(14.2700, 121.1000, 20, false, (select device_id from t_ids), null, null, false, now() - interval '5 minutes');
reset role;
select pg_temp.note('3 offline, 8 km away');

select pg_temp.clear_days();
set local role authenticated;
insert into t_out (step, result) select '4 offline, inside', public.time_in(14.2000, 121.1000, 10, false, (select device_id from t_ids), null, null, false, now() - interval '5 minutes');
reset role;
select pg_temp.note('4 offline, inside');

-- Ramon drives a van whose home office is Pacita HQ; he's timed in at the site
with v as (insert into public.vehicles (name, plate, home_office_id)
  values ('ROLLBACK van', 'TEST 000', (select id from public.office_locations where name = 'Pacita HQ')) returning id)
update public.job_members set role = 'driver', vehicle_id = (select id from v)
where person_id = (select person_id from t_ids) and job_id = (select id from public.jobs where client_name = 'ROLLBACK test');
update public.jobs set status = 'done' where client_name = 'ROLLBACK test'; -- so an early time-out isn't what's tested
set local role authenticated;
insert into t_out (step, result) select '5 driver online, away', public.time_out(14.2000, 121.1000, (select device_id from t_ids));
insert into t_out (step, result) select '6 driver offline, no GPS', public.time_out(null, null, (select device_id from t_ids), now() - interval '1 minute');
reset role;
select pg_temp.note('6 driver offline, no GPS');

select step, result ->> 'status' as status, day_status, review from t_out order by step;
rollback;
