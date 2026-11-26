-- One ID per physical tool (Round 4 C14 / A1; C19 "Needs checking"; C20 pick-up or driver). tools stays the kind of
-- tool ("DeWalt drill") and keeps total_stock / available_stock as before, so every screen that reads them still works.
-- tool_units: each unit has its own tag (TC-DEW-0003) and status. total_stock = units available + lent: a trigger adds
-- or retires units whenever total_stock changes, so the Add / Edit tool form needs no change.
create table public.tool_units (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  tag text not null unique,
  status text not null default 'available' check (status in ('available', 'lent', 'needs_check', 'lost', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tool_units_tool_id_idx on public.tool_units (tool_id);
alter table public.tool_units enable row level security;
create policy "everyone reads tool units" on public.tool_units for select to authenticated using (true);

alter table public.tool_borrowings
  add column unit_id uuid references public.tool_units(id),
  add column delivery text check (delivery in ('pickup', 'driver'));
create index tool_borrowings_unit_id_idx on public.tool_borrowings (unit_id);

-- Keep units in step with total_stock (adds new tagged units, or retires available ones).
create or replace function public.sync_tool_units() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_active int;
  v_prefix text;
  v_n int;
begin
  select count(*) into v_active from public.tool_units where tool_id = new.id and status in ('available', 'lent');
  if new.total_stock > v_active then
    v_prefix := 'TC-' || coalesce(nullif(upper(left(regexp_replace(new.name, '[^A-Za-z0-9]', '', 'g'), 3)), ''), 'TOL');
    select coalesce(max(split_part(tag, '-', 3)::int) filter (where split_part(tag, '-', 3) ~ '^\d+$'), 0) into v_n
      from public.tool_units where tag like v_prefix || '-%';
    insert into public.tool_units (tool_id, tag)
      select new.id, v_prefix || '-' || lpad((v_n + g)::text, 4, '0') from generate_series(1, new.total_stock - v_active) g;
  elsif new.total_stock < v_active then
    update public.tool_units set status = 'retired', updated_at = now()
    where id in (select id from public.tool_units where tool_id = new.id and status = 'available' order by tag desc limit v_active - new.total_stock);
  end if;
  return null;
end $$;
revoke all on function public.sync_tool_units() from public, anon, authenticated;
create trigger sync_tool_units after insert or update of total_stock on public.tools
  for each row execute function public.sync_tool_units();

-- IDs for the tools already in the warehouse, then the open loans get one of their tool's units each.
update public.tools set total_stock = total_stock;
do $$
declare
  b record;
  u uuid;
begin
  for b in select id, tool_id, quantity from public.tool_borrowings where status = 'checked_out' and unit_id is null order by handed_over_at loop
    if b.quantity <> 1 then raise exception 'borrowing % has quantity %: split it by hand first', b.id, b.quantity; end if;
    select id into u from public.tool_units where tool_id = b.tool_id and status = 'available' order by tag limit 1;
    if u is null then raise exception 'no unit left for borrowing %', b.id; end if;
    update public.tool_units set status = 'lent' where id = u;
    update public.tool_borrowings set unit_id = u where id = b.id;
  end loop;
end $$;

-- Lend specific units: one borrowing per unit, all or nothing.
create or replace function public.lend_tool_units(p_technician_id uuid, p_unit_ids uuid[], p_notes text default null, p_delivery text default 'pickup')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_units public.tool_units[];
  v_tool uuid;
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
    if v_tool is not null and u.tool_id <> v_tool then return jsonb_build_object('status', 'mixed_tools'); end if;
    v_tool := u.tool_id;
  end loop;
  update public.tool_units set status = 'lent', updated_at = now() where id = any(p_unit_ids);
  insert into public.tool_borrowings (tool_id, technician_id, status, handed_over_at, quantity, notes, unit_id, delivery)
    select v_tool, p_technician_id, 'checked_out', now(), 1, nullif(trim(p_notes), ''), x.id, p_delivery from unnest(v_units) x;
  update public.tools set available_stock = available_stock - array_length(p_unit_ids, 1), updated_at = now() where id = v_tool;
  return jsonb_build_object('status', 'lent', 'count', array_length(p_unit_ids, 1), 'tags', (select array_agg(x.tag) from unnest(v_units) x));
end $$;
revoke all on function public.lend_tool_units(uuid, uuid[], text, text) from public, anon;
grant execute on function public.lend_tool_units(uuid, uuid[], text, text) to authenticated;

-- A unit checked in damaged: back in service (counts again) or written off.
create or replace function public.decide_tool_unit(p_unit_id uuid, p_back_in_service boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u public.tool_units;
begin
  if public.my_role() not in ('ceo', 'coordinator') then raise exception 'Only the Coordinator can do this'; end if;
  select * into u from public.tool_units where id = p_unit_id for update;
  if not found or u.status <> 'needs_check' then return jsonb_build_object('status', 'not_waiting'); end if;
  update public.tool_units set status = case when p_back_in_service then 'available' else 'retired' end, updated_at = now() where id = u.id;
  if p_back_in_service then
    -- unit first, so the sync trigger already sees it and adds no new unit
    update public.tools set total_stock = total_stock + 1, available_stock = available_stock + 1, updated_at = now() where id = u.tool_id;
  end if;
  return jsonb_build_object('status', 'done', 'tag', u.tag);
end $$;
revoke all on function public.decide_tool_unit(uuid, boolean) from public, anon;
grant execute on function public.decide_tool_unit(uuid, boolean) to authenticated;

-- check_in_tool: set the unit's status too (patched in place; before the stock update, so the trigger adds nothing).
do $$
declare
  def text := pg_get_functiondef('public.check_in_tool(uuid,text,text,text,uuid)'::regprocedure);
  anchor text := E'  if p_status = ''returned'' then\n    update public.tools set available_stock';
begin
  if position(anchor in def) = 0 then raise exception 'check_in_tool changed: anchor not found'; end if;
  execute replace(def, anchor, E'  if b.unit_id is not null then\n    update public.tool_units set status = case p_status when ''returned'' then ''available'' when ''damaged'' then ''needs_check'' else ''lost'' end,\n      updated_at = now() where id = b.unit_id;\n  end if;\n\n' || anchor);
end $$;
