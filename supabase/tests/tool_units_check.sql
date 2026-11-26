-- Check for the tool ID rules (migration 20261126011929_tool_units): lending, returning, a damaged check-in and
-- "Back in service" must keep each ID's status and the tool's totals in step. Changes nothing: it all rolls back.
-- Run the whole file in the Supabase SQL editor (or the SQL tool). It fails with a message naming the broken step.
-- Uses demo helper Allan Torres and the demo coordinator account; never a groupmate.
begin;

do $$
declare
  v_tool uuid;
  v_allan uuid := (select id from public.profiles where full_name = 'Allan Torres');
  v_units uuid[];
  v_total int;
  v_avail int;
  r jsonb;
  b1 uuid;
  b2 uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated',
    'sub', (select u.id from auth.users u where u.email = 'coordinator@technocycle.ph'))::text, true);
  select id, total_stock, available_stock into v_tool, v_total, v_avail from public.tools
    where status = 'active' and available_stock >= 2 order by name limit 1;
  select array_agg(id order by tag) into v_units from (select id, tag from public.tool_units
    where tool_id = v_tool and status = 'available' order by tag limit 2) x;

  -- 1. Lend 2 IDs: both "lent", 2 fewer in the warehouse, total unchanged
  r := public.lend_tool_units(v_allan, v_units, 'tool_units_check', 'driver');
  assert r->>'status' = 'lent' and r->>'name' = 'Allan Torres', format('1. lend answered %s', r);
  assert (select count(*) from public.tool_units where id = any(v_units) and status = 'lent') = 2, '1. IDs not marked lent';
  assert (select available_stock from public.tools where id = v_tool) = v_avail - 2, '1. warehouse count not lowered by 2';
  assert (select total_stock from public.tools where id = v_tool) = v_total, '1. total changed on lend';

  -- 2. Lending a lent ID again is refused
  r := public.lend_tool_units(v_allan, v_units[1:1], 'tool_units_check', 'pickup');
  assert r->>'status' = 'taken', format('2. second lend answered %s', r);

  -- 3. Return the first: back in the warehouse
  select id into b1 from public.tool_borrowings where unit_id = v_units[1] and status = 'checked_out';
  perform public.check_in_tool(b1, 'returned', 'good', 'tool_units_check');
  assert (select status from public.tool_units where id = v_units[1]) = 'available', '3. returned ID not available';
  assert (select available_stock from public.tools where id = v_tool) = v_avail - 1, '3. warehouse count wrong after return';

  -- 4. The second comes back damaged: "needs_check", no longer owned, and no new ID created
  select id into b2 from public.tool_borrowings where unit_id = v_units[2] and status = 'checked_out';
  perform public.check_in_tool(b2, 'damaged', 'damaged', 'tool_units_check');
  assert (select status from public.tool_units where id = v_units[2]) = 'needs_check', '4. damaged ID not needs_check';
  assert (select total_stock from public.tools where id = v_tool) = v_total - 1, '4. total not lowered for the damaged one';
  assert (select count(*) from public.tool_units where tool_id = v_tool and status in ('available', 'lent')) = v_total - 1, '4. IDs and total out of step';

  -- 5. Back in service: available again, owned again, still no extra ID
  r := public.decide_tool_unit(v_units[2], true);
  assert r->>'status' = 'done', format('5. decide answered %s', r);
  assert (select status from public.tool_units where id = v_units[2]) = 'available', '5. ID not available after back in service';
  assert (select total_stock from public.tools where id = v_tool) = v_total, '5. total not restored';
  assert (select available_stock from public.tools where id = v_tool) = v_avail, '5. warehouse count not restored';
  assert (select count(*) from public.tool_units where tool_id = v_tool and status in ('available', 'lent')) = v_total, '5. IDs and total out of step';

end $$;

select 'tool_units check passed' as result;
rollback;
