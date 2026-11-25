-- Leave credits (client interview, Nov 2026; CONSULTATION_FIXES B9): 5 sick + 5 vacation a year. Sick leave uses sick
-- credits first, then vacation credits ("basta may 10 kang natira"); vacation and emergency leave use vacation credits.
-- Days past the credits, and unpaid leave, are "without credits" (salary deduction: counted here, no amounts).
-- Approved leave days only, Monday to Saturday (Sunday is the rest day). Optional p_add_*: the balance if this request
-- were approved too (HR's review). The person themself, HR and the CEO may ask.
create or replace function public.leave_credits(
  p_person uuid, p_year int default null, p_add_type text default null, p_add_start date default null, p_add_end date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  y int := coalesce(p_year, extract(year from now() at time zone 'Asia/Manila')::int);
  sick int; vac int; unpaid int; over int; need int;
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

  over := greatest(sick - 5, 0);
  need := vac + over;
  return jsonb_build_object(
    'year', y, 'sick_total', 5, 'vacation_total', 5,
    'sick_left', 5 - least(sick, 5),
    'vacation_left', 5 - least(need, 5),
    'without_credits', greatest(need - 5, 0) + unpaid);
end $$;
revoke all on function public.leave_credits(uuid, int, text, date, date) from public, anon;
grant execute on function public.leave_credits(uuid, int, text, date, date) to authenticated;
