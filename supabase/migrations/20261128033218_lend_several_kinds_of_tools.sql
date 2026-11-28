-- Bulk lend (28 Nov, Andrew): one lend can hand over IDs of different tools (a drill AND a gauge), all or nothing.
-- Tested on live data in a rolled-back block: 2 kinds in one call, each tool's available_stock down 1, 2 borrowings.
create or replace function public.lend_tool_units(p_technician_id uuid, p_unit_ids uuid[], p_notes text default null, p_delivery text default 'pickup')
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_units public.tool_units[];
  u public.tool_units;
begin
  if public.my_role() not in ('ceo', 'coordinator') then raise exception 'Only the Coordinator can lend tools'; end if;
  if p_delivery not in ('pickup', 'driver') then raise exception 'Unknown delivery %', p_delivery; end if;
  if coalesce(array_length(p_unit_ids, 1), 0) = 0 then return jsonb_build_object('status', 'none_picked'); end if;
  if not exists (select 1 from public.profiles where id = p_technician_id and role in ('technician', 'helper') and lifecycle_status in ('active', 'on_leave')) then
    return jsonb_build_object('status', 'bad_person');
  end if;
  select array_agg(t order by t.tag) into v_units from (select * from public.tool_units where id = any(p_unit_ids) for update) t;
  if coalesce(array_length(v_units, 1), 0) <> array_length(p_unit_ids, 1) then return jsonb_build_object('status', 'not_found'); end if;
  foreach u in array v_units loop
    if u.status <> 'available' then return jsonb_build_object('status', 'taken', 'tag', u.tag); end if;
  end loop;
  update public.tool_units set status = 'lent', updated_at = now() where id = any(p_unit_ids);
  insert into public.tool_borrowings (tool_id, technician_id, status, handed_over_at, quantity, notes, unit_id, delivery)
    select x.tool_id, p_technician_id, 'checked_out', now(), 1, nullif(trim(p_notes), ''), x.id, p_delivery from unnest(v_units) x;
  update public.tools t set available_stock = t.available_stock - c.n, updated_at = now()
    from (select x.tool_id, count(*)::int n from unnest(v_units) x group by x.tool_id) c where t.id = c.tool_id;
  return jsonb_build_object('name', (select full_name from public.profiles where id = p_technician_id), 'status', 'lent', 'count', array_length(p_unit_ids, 1), 'tags', (select array_agg(x.tag) from unnest(v_units) x));
end $function$;
