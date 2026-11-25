-- Test helper from the Brief 10 check (counts the no-grace lines in time_in); dropped in 20261125221538.
create or replace function public.check_time_in_late_count() returns integer language sql security definer as $$
  select count(*)::integer from regexp_matches(pg_get_functiondef('public.time_in(double precision,double precision,double precision,boolean,text,text,text,boolean,timestamp with time zone)'::regprocedure), 'v_late > 0', 'g');
$$;
