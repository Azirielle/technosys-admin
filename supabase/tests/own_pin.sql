-- Test: technicians making their own PIN (migration 20261119112547_own_pin_for_field_staff).
-- How to run: paste into the Supabase SQL editor and run. It ends with ROLLBACK, so nothing is kept.
-- Uses Pedro Reyes (demo data, PIN set by HR) and an HR account. Expected:
--   1 HR pin, is own?          false
--   2 weak 1111                weak
--   3 first own, no current    saved      (replacing HR's temporary PIN needs no current PIN)
--   4 is own now?              true
--   5 change, no current       wrong_current
--   6 change, wrong current    wrong_current
--   7 change, right current    saved
--   8 HR calls it              not_field_staff
--   9 PIN now works            true

begin;
create temp table t (step text, result text) on commit drop;
grant all on t to authenticated;
create temp table ids on commit drop as select (select id from profiles where full_name='Pedro Reyes') pedro, (select id from profiles where role='hr' limit 1) hr;
grant select on ids to authenticated;
select set_config('request.jwt.claims', json_build_object('sub',(select pedro from ids),'role','authenticated')::text, true);
set local role authenticated;
insert into t select '1 HR pin, is own?', public.my_pin_is_own()::text;
insert into t select '2 weak 1111', public.set_my_pin('1111') ->> 'status';
insert into t select '3 first own, no current', public.set_my_pin('2580') ->> 'status';
insert into t select '4 is own now?', public.my_pin_is_own()::text;
insert into t select '5 change, no current', public.set_my_pin('3691') ->> 'status';
insert into t select '6 change, wrong current', public.set_my_pin('3691','0000') ->> 'status';
insert into t select '7 change, right current', public.set_my_pin('3691','2580') ->> 'status';
reset role;
select set_config('request.jwt.claims', json_build_object('sub',(select hr from ids),'role','authenticated')::text, true);
set local role authenticated;
insert into t select '8 HR calls it', public.set_my_pin('3691') ->> 'status';
reset role;
insert into t select '9 PIN now works', (select (pin_hash = extensions.crypt('3691', pin_hash))::text from login_pins where profile_id=(select pedro from ids));
select * from t order by step;
rollback;
