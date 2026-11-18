-- Test: checking tools back in (public.check_in_tool) and the stock rule (tools_stock_in_range).
-- How to run: paste the whole file into the Supabase SQL editor and run it. It ends with ROLLBACK, so nothing is kept.
-- Uses a throwaway tool (5 owned) lent 3 times to Pedro Reyes (demo data), 1 each.
-- Expected result, one line per case (stock as total/available; it starts at 5/2):
--   1 returned in good shape    → checked_in          · 5/3  (back in the warehouse)
--   2 same one checked in again → already_checked_in  · 5/3  (not counted twice)
--   3 lost                      → checked_in          · 4/3  (leaves the total)
--   4 damaged                   → checked_in          · 3/3
--   5 available above total     → refused by tools_stock_in_range
--   6 a technician calls it     → refused (only the admin's server code may)

begin;
create temp table t_out (step text, result text, stock text) on commit drop;

insert into public.tools (name, category, total_stock, available_stock) values ('ROLLBACK tool', 'General Tools', 5, 2);
insert into public.tool_borrowings (tool_id, technician_id, quantity, status, handed_over_at)
select t.id, p.id, 1, 'checked_out', now() - interval '1 day'
from public.tools t, public.profiles p, generate_series(1, 3)
where t.name = 'ROLLBACK tool' and p.full_name = 'Pedro Reyes';

create or replace function pg_temp.b(n int) returns uuid language sql as $$
  select b.id from public.tool_borrowings b join public.tools t on t.id = b.tool_id
  where t.name = 'ROLLBACK tool' order by b.id offset n - 1 limit 1;
$$;
create or replace function pg_temp.stock() returns text language sql as $$
  select total_stock || '/' || available_stock from public.tools where name = 'ROLLBACK tool';
$$;

insert into t_out select '1 returned in good shape', public.check_in_tool(pg_temp.b(1), 'returned', 'good') ->> 'status', pg_temp.stock();
insert into t_out select '2 same one checked in again', public.check_in_tool(pg_temp.b(1), 'returned', 'good') ->> 'status', pg_temp.stock();
insert into t_out select '3 lost', public.check_in_tool(pg_temp.b(2), 'lost', 'lost', 'Left at the site') ->> 'status', pg_temp.stock();
insert into t_out select '4 damaged', public.check_in_tool(pg_temp.b(3), 'damaged', 'damaged', 'Cracked') ->> 'status', pg_temp.stock();

do $$ begin
  update public.tools set available_stock = total_stock + 1 where name = 'ROLLBACK tool';
  insert into t_out values ('5 available above total', 'NOT refused', pg_temp.stock());
exception when check_violation then
  insert into t_out values ('5 available above total', 'refused', pg_temp.stock());
end $$;

do $$ begin
  set local role authenticated;
  perform public.check_in_tool(gen_random_uuid(), 'returned', 'good');
  reset role;
  insert into t_out values ('6 a technician calls it', 'NOT refused', null);
exception when insufficient_privilege then
  reset role;
  insert into t_out values ('6 a technician calls it', 'refused', null);
end $$;

select * from t_out order by step;
rollback;
