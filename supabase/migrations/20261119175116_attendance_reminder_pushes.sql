-- Attendance reminders by push, every 5 minutes (Andrew, 20 Nov). Each goes once per person per day:
--   in_soon  10 min before the day's first job starts, not timed in yet: "Your job at X starts at 1:00 PM…"
--   in_now   at the start, still not timed in: "You'll be marked late at 1:15 PM."
--   out_late 30 min after the job (or office day) ends, still timed in, no overtime asked: "Time out when you leave X."
-- The push carries a "Time in" / "Time out" button (categoryId) that opens the app straight into it; the app does the
-- location check as always. Sent straight to Expo's push service with pg_net.
create table public.attendance_reminders (
  person_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  kind text not null check (kind in ('in_soon', 'in_now', 'out_late')),
  sent_at timestamptz not null default now(),
  primary key (person_id, work_date, kind)
);
alter table public.attendance_reminders enable row level security; -- no policies: only the function below writes it

create or replace function public.send_attendance_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  v_today date := public.manila_today();
  r record;
  v_msgs jsonb := '[]'::jsonb;
  v_sent integer := 0;
  clock constant text := 'FMHH12:MI AM';
begin
  for r in
    with first_job as (
      select distinct on (m.person_id) m.person_id, j.client_name, public.manila_at(v_today, j.start_time) as starts
      from public.jobs j
      join public.job_members m on m.job_id = j.id and m.removed_at is null and m.person_id is not null
      join public.profiles p on p.id = m.person_id and p.role in ('technician', 'helper') and p.lifecycle_status = 'active'
      where j.status in ('planned', 'ongoing') and v_today between j.start_date and j.end_date
      order by m.person_id, j.start_time
    )
    select f.person_id,
      case when v_now < f.starts then 'in_soon' else 'in_now' end as kind,
      case when v_now < f.starts then 'Job starting soon' else 'Time in now' end as title,
      case when v_now < f.starts
        then format('Your job at %s starts at %s. Time in when you arrive.', f.client_name, to_char(f.starts at time zone 'Asia/Manila', clock))
        else format('You''ll be marked late at %s.', to_char((f.starts + interval '15 minutes') at time zone 'Asia/Manila', clock)) end as body,
      'time_in' as button
    from first_job f
    where v_now between f.starts - interval '10 minutes' and f.starts + interval '14 minutes'
      and not exists (select 1 from public.work_days w where w.person_id = f.person_id and w.work_date = v_today)
    union all
    select w.person_id, 'out_late', 'Still working?',
      format('Time out when you leave %s.', coalesce(j.client_name, 'the office')), 'time_out'
    from public.work_days w
    left join public.jobs j on j.id = w.job_id
    where w.work_date = v_today and w.time_out is null
      and v_now >= public.manila_at(w.work_date, coalesce(j.end_time, public.office_day_end())) + interval '30 minutes'
      and not exists (select 1 from public.overtime_requests o where o.work_day_id = w.id and o.status in ('pending', 'approved'))
  loop
    insert into public.attendance_reminders (person_id, work_date, kind) values (r.person_id, v_today, r.kind)
    on conflict do nothing;
    if not found then continue; end if; -- already reminded today
    v_sent := v_sent + 1;
    select v_msgs || coalesce(jsonb_agg(jsonb_build_object(
      'to', t.token, 'title', r.title, 'body', r.body, 'sound', 'default', 'priority', 'high',
      'categoryId', r.button, 'data', jsonb_build_object('kind', r.button || '_reminder'))), '[]'::jsonb)
    into v_msgs
    from public.push_tokens t where t.user_id = r.person_id and t.token like 'ExponentPushToken[%';
  end loop;

  if jsonb_array_length(v_msgs) > 0 then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := v_msgs,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
  return v_sent;
end;
$$;
revoke execute on function public.send_attendance_reminders() from public, anon, authenticated;

select cron.schedule('attendance-reminders', '*/5 * * * *', 'select public.send_attendance_reminders()');
