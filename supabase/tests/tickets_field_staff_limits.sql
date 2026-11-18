-- Test for what field staff may change on their own tickets (migration 20261118180219_tickets_field_staff_can_only_close_techy_chat).
-- How to run: paste the whole file into the Supabase SQL editor and run it. It ends with ROLLBACK, so nothing is kept.
-- Uses the first demo technician, test tickets made inside the test only, and the HR demo account.
-- Expected result, one line per case:
--   1 close own Techy chat ("End")           → allowed
--   2 switch HR's chat back to the AI          → refused
--   3 close a Techy chat HR has taken over     → refused
--   4 change status on a form ticket           → refused
--   5 change the category of own Techy chat    → refused
--   6 close own Techy chat and rename it       → refused
--   7 HR changes a ticket                      → allowed

begin;
create temp table t_out (step text, result text) on commit drop;
grant all on t_out to authenticated;
create temp table t_ids on commit drop as
select (select id from public.profiles where role = 'technician' order by full_name limit 1) as tech,
       (select id from public.profiles where role = 'hr' limit 1) as hr;
grant select on t_ids to authenticated;

insert into public.tickets (employee_id, title, category, description, handling_mode, status) select tech, 'Support Conversation', 'General Inquiry', 'rollback test a', 'AI', 'open' from t_ids;
insert into public.tickets (employee_id, title, category, description, handling_mode, status) select tech, 'Support Conversation', 'General Inquiry', 'rollback test b', 'ADMIN', 'in_progress' from t_ids;
insert into public.tickets (employee_id, title, category, description, handling_mode, status) select tech, 'ROLLBACK form ticket', 'DTR Issue', 'rollback test c', 'ADMIN', 'open' from t_ids;

-- Tries one change as the signed-in person; notes whether the database allowed it
create or replace function pg_temp.try(p_step text, p_sql text) returns void language plpgsql as $$
declare n int;
begin
  execute p_sql; get diagnostics n = row_count;
  insert into t_out values (p_step, case when n > 0 then 'allowed' else 'no row' end);
exception when insufficient_privilege then
  insert into t_out values (p_step, 'refused');
end $$;

select set_config('request.jwt.claims', json_build_object('sub', (select tech from t_ids), 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.try('1 close own Techy chat', $q$update public.tickets set status = 'closed' where description = 'rollback test a'$q$);
select pg_temp.try('2 switch HR''s chat back to the AI', $q$update public.tickets set handling_mode = 'AI' where description = 'rollback test b'$q$);
select pg_temp.try('3 close a Techy chat HR has taken over', $q$update public.tickets set status = 'closed' where description = 'rollback test b'$q$);
select pg_temp.try('4 change status on a form ticket', $q$update public.tickets set status = 'resolved' where description = 'rollback test c'$q$);
select pg_temp.try('5 change category of own Techy chat', $q$update public.tickets set category = 'Payroll' where description = 'rollback test a'$q$);
select pg_temp.try('6 close own Techy chat and rename it', $q$update public.tickets set status = 'closed', title = 'x' where description = 'rollback test a'$q$);
reset role;

select set_config('request.jwt.claims', json_build_object('sub', (select hr from t_ids), 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.try('7 HR changes a ticket', $q$update public.tickets set status = 'resolved', handling_mode = 'ADMIN' where description = 'rollback test c'$q$);
reset role;

select * from t_out order by step;
rollback;
