-- Andrew, 28 Nov: a vacation (or emergency) leave longer than the vacation credits left: HR decides whether the extra
-- days are unpaid (absent, no credits) or taken from the sick credits. sick_days = how many of this leave's days HR
-- charged to sick credits (0 = the extra days stay without credits). leave_credits counts them as sick days.
alter table public.leaves add column sick_days integer not null default 0;
alter table public.leaves add constraint leaves_sick_days_check
  check (sick_days >= 0 and (sick_days = 0 or leave_type in ('vacation', 'emergency')));

create or replace function public.leave_credits(p_person uuid, p_year integer default null::integer, p_add_type text default null::text,
  p_add_start date default null::date, p_add_end date default null::date)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  y int := coalesce(p_year, extract(year from now() at time zone 'Asia/Manila')::int);
  sick int; vac int; unpaid int; over int; need int; moved int;
begin
  if p_person is distinct from auth.uid() and coalesce(public.my_role(), '') not in ('hr', 'ceo') then
    raise exception 'Not allowed';
  end if;
  with days as (
    select l.leave_type as t, d::date as day
    from public.leaves l, generate_series(greatest(l.start_date, make_date(y, 1, 1)), least(l.end_date, make_date(y, 12, 31)), interval '1 day') d
    where l.technician_id = p_person and l.status = 'approved'
    union all
    select p_add_type, d::date from generate_series(greatest(p_add_start, make_date(y, 1, 1)), least(p_add_end, make_date(y, 12, 31)), interval '1 day') d
    where p_add_type is not null
  )
  select count(*) filter (where t = 'sick'), count(*) filter (where t in ('vacation', 'emergency')), count(*) filter (where t = 'unpaid')
  into sick, vac, unpaid
  from days where extract(isodow from day) <> 7;

  -- Vacation days HR charged to sick credits
  select coalesce(sum(l.sick_days), 0) into moved from public.leaves l
  where l.technician_id = p_person and l.status = 'approved' and extract(year from l.start_date) = y;
  sick := sick + moved;
  vac := vac - moved;

  over := greatest(sick - 5, 0);
  need := vac + over;
  return jsonb_build_object(
    'year', y, 'sick_total', 5, 'vacation_total', 5,
    'sick_left', 5 - least(sick, 5),
    'vacation_left', 5 - least(need, 5),
    'without_credits', greatest(need - 5, 0) + unpaid);
end $function$;
