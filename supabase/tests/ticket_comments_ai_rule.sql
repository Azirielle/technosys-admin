-- Test for who may post in a ticket conversation (migration 20261117231452_ticket_comments_ai_stops_after_hr).
-- How to run: paste the whole file into the Supabase SQL editor and run it. It ends with ROLLBACK, so nothing is kept.
-- Uses the first demo technician and a test ticket made inside the test only.
-- Expected result, one line per case:
--   1 own message, AI handling   → allowed
--   2 posing as HR ('admin')     → refused
--   3 posing as the system       → refused
--   4 AI answer before HR        → allowed
--   5 AI answer after HR took it → refused
--   6 own message after HR       → allowed

begin;
create temp table t_out (step text, result text) on commit drop;
grant all on t_out to authenticated;

create temp table t_ids on commit drop as
select p.id as person_id from public.profiles p where p.role = 'technician' order by p.full_name limit 1;
grant select on t_ids to authenticated;

insert into public.tickets (employee_id, title, category, description, handling_mode)
select person_id, 'ROLLBACK test', 'Others', 'x', 'AI' from t_ids;

-- Tries to post one message as the technician; notes whether the database allowed it
create or replace function pg_temp.try_post(p_step text, p_sender text) returns void language plpgsql as $$
begin
  insert into public.ticket_comments (ticket_id, author_id, content, sender_role)
  select t.id, (select person_id from t_ids), 'test', p_sender from public.tickets t where t.title = 'ROLLBACK test';
  insert into t_out values (p_step, 'allowed');
exception when insufficient_privilege then
  insert into t_out values (p_step, 'refused');
end $$;

select set_config('request.jwt.claims', json_build_object('sub', (select person_id from t_ids), 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.try_post('1 own message, AI handling', 'technician');
select pg_temp.try_post('2 posing as HR (admin)', 'admin');
select pg_temp.try_post('3 posing as the system', 'system');
select pg_temp.try_post('4 AI answer before HR', 'ai');
reset role;

update public.tickets set handling_mode = 'ADMIN' where title = 'ROLLBACK test'; -- "Answer as HR"

set local role authenticated;
select pg_temp.try_post('5 AI answer after HR took it', 'ai');
select pg_temp.try_post('6 own message after HR', 'technician');
reset role;

select * from t_out order by step;
rollback;
