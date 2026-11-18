-- Inventory: checking a tool back in is one step in the database, and stock can't go out of range.
-- Before, the admin marked the borrowing returned and then wrote the stock it had read earlier, as two saves:
-- a double click or two staff checking in the same tool both added it back (1 drill returned = +2), and a failed
-- second save left the tool "returned" with the stock never put back. check_in_tool locks the borrowing, refuses a
-- second check-in, and changes the borrowing and the stock together. Rule kept everywhere:
-- available = total - lent out; a lost or damaged tool leaves the total (it isn't owned in working order any more).
update public.tools t
set available_stock = t.total_stock - coalesce((select sum(b.quantity) from public.tool_borrowings b
  where b.tool_id = t.id and b.status = 'checked_out'), 0)
where true;

alter table public.tools add constraint tools_stock_in_range check (available_stock >= 0 and available_stock <= total_stock);

create or replace function public.check_in_tool(
  p_borrowing_id uuid, p_status text, p_condition text, p_notes text default null, p_received_by uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b public.tool_borrowings%rowtype;
  t public.tools%rowtype;
begin
  if p_status not in ('returned', 'lost', 'damaged') then raise exception 'Unknown check-in status %', p_status; end if;

  select * into b from public.tool_borrowings where id = p_borrowing_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if b.status <> 'checked_out' then return jsonb_build_object('status', 'already_checked_in'); end if;
  select * into t from public.tools where id = b.tool_id for update;

  update public.tool_borrowings
  set returned_at = now(), status = p_status, condition_on_return = p_condition,
      condition_notes = nullif(trim(p_notes), ''), received_by = p_received_by,
      notes = coalesce(nullif(trim(p_notes), ''), b.notes)
  where id = b.id;

  if p_status = 'returned' then
    update public.tools set available_stock = available_stock + b.quantity, updated_at = now() where id = t.id;
  else
    update public.tools set total_stock = total_stock - b.quantity, updated_at = now() where id = t.id;
  end if;

  return jsonb_build_object('status', 'checked_in', 'tool_name', t.name, 'technician_id', b.technician_id, 'quantity', b.quantity);
end;
$$;
-- Only the admin's server code calls it (after its own office-staff check)
revoke execute on function public.check_in_tool(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.check_in_tool(uuid, text, text, text, uuid) to service_role;
