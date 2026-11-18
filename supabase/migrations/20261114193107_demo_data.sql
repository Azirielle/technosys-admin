-- Demo data for the final defense: 5 more field staff, ~2 weeks of attendance, jobs, leaves,
-- overtime, tickets, tool borrowings and announcements.
--
-- RE-RUNNABLE. Every date is counted from the day it runs ("today", "3 days ago"), so re-run it on the
-- morning of the defense and the screens show that day. Paste the whole file into the Supabase SQL editor.
--
-- SAFE FOR YOUR OWN TESTS. Every row made here has a fixed id made from a label (see sid below). A re-run
-- deletes only those ids and makes them again. A ticket or leave you file yourself is never touched.
--
-- No push notifications are sent: the push triggers are switched off while this runs.
-- New logins (username = password, demo only): mark, joel, rico, allan, jerome.
--
-- This file is the demo seed, meant to be re-run; it was updated in place on 15 Nov (random-looking ids so
-- each ticket gets its own reference, no repeated first message, HR's resolve note saved like the app does).

-- Helpers (exist only while this runs) -------------------------------------------------------------
-- sid(kind, n): the fixed id of seeded row n of one kind. It looks random (so ticket references differ),
-- but is always the same for the same kind and n.
create or replace function pg_temp.sid(kind int, n int) returns uuid language sql immutable as $$
  select md5('technosys-demo:' || kind || ':' || n)::uuid
$$;
-- seeded(kind): every id this file can make for one kind.
create or replace function pg_temp.seeded(kind int) returns setof uuid language sql immutable as $$
  select pg_temp.sid(kind, g) from generate_series(1, 300) g
$$;
-- at(day, time): that Manila wall-clock time as a timestamp.
create or replace function pg_temp.at(d date, t time) returns timestamptz language sql immutable as $$
  select (d + t) at time zone 'Asia/Manila'
$$;
create or replace function pg_temp.today() returns date language sql stable as $$
  select (now() at time zone 'Asia/Manila')::date
$$;
-- who(username): profile id from the login name.
create or replace function pg_temp.who(username text) returns uuid language sql stable as $$
  select id from auth.users where email = username || '@technocycle.ph'
$$;

alter table public.tickets disable trigger on_ticket_created_or_updated;
alter table public.ticket_comments disable trigger on_ticket_comment_push;
alter table public.attendance_logs disable trigger trg_prevent_duplicate_clockins;

-- 1. Remove the previous demo rows ----------------------------------------------------------------------
-- (Rows whose id starts with "de5eed" come from the first version of this file.)
delete from public.ticket_comments where ticket_id in (select pg_temp.seeded(8)) or id in (select pg_temp.seeded(9)) or ticket_id::text like 'de5eed%';
delete from public.tickets where id in (select pg_temp.seeded(8)) or id::text like 'de5eed%';
delete from public.schedule_history where schedule_id in (select pg_temp.seeded(2)) or schedule_id::text like 'de5eed%';
delete from public.schedule_casual_helpers where schedule_id in (select pg_temp.seeded(2)) or schedule_id::text like 'de5eed%';
delete from public.schedule_crew where schedule_id in (select pg_temp.seeded(2)) or schedule_id::text like 'de5eed%';
delete from public.schedules where id in (select pg_temp.seeded(2)) or id::text like 'de5eed%';
delete from public.attendance_logs where id in (select pg_temp.seeded(1)) or id::text like 'de5eed%';
delete from public.leaves where id in (select pg_temp.seeded(6)) or id::text like 'de5eed%';
delete from public.overtime_requests where id in (select pg_temp.seeded(7)) or id::text like 'de5eed%';
delete from public.tool_borrowings where id in (select pg_temp.seeded(10)) or id::text like 'de5eed%';
delete from public.announcements where id in (select pg_temp.seeded(11)) or id::text like 'de5eed%';
-- The 5 demo staff; their profiles and records follow (cascade).
delete from auth.users where id in (select pg_temp.seeded(0)) or id::text like 'de5eed00%';

-- 2. Five more field staff ------------------------------------------------------------------------------
do $$
declare v record;
begin
  for v in select * from (values
    (1, 'mark',   'Mark Villanueva', 'technician', 'technician', '09171234504', false, date '2023-02-06', 'regular',      true,  true),
    (2, 'joel',   'Joel Ramirez',    'technician', 'technician', '09171234505', true,  date '2021-08-16', 'regular',      true,  true),
    (3, 'rico',   'Rico Navarro',    'helper',     'helper',     '09171234506', false, date '2025-07-01', 'provisionary', true,  false),
    (4, 'allan',  'Allan Torres',    'helper',     'helper',     '09171234507', false, date '2024-11-04', 'regular',      true,  true),
    (5, 'jerome', 'Jerome Castillo', 'helper',     'helper',     '09171234508', false, date '2026-09-14', 'contractual',  false, false)
  ) t(n, username, full_name, role, level, phone, is_driver, hired, emp_status, has_ids, has_medical) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', pg_temp.sid(0, v.n), 'authenticated', 'authenticated',
            v.username || '@technocycle.ph', extensions.crypt(v.username, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v.full_name, 'role', v.role),
            now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), pg_temp.sid(0, v.n), pg_temp.sid(0, v.n)::text, 'email',
            jsonb_build_object('sub', pg_temp.sid(0, v.n)::text, 'email', v.username || '@technocycle.ph', 'email_verified', true),
            now(), now(), now());
    insert into public.profiles (id, full_name, role, technician_level, contact_number, is_driver, hire_date,
                                 employment_status, lifecycle_status, branch_id,
                                 has_sss_id, has_philhealth_id, has_pagibig_id, has_nbi_clearance, has_resume, has_medical_clearance)
    values (pg_temp.sid(0, v.n), v.full_name, v.role::public.user_role, v.level, v.phone, v.is_driver, v.hired,
            v.emp_status, 'active', (select id from public.office_locations where name = 'Pacita HQ'),
            v.has_ids, v.has_ids, v.has_ids, v.has_ids, true, v.has_medical)
    on conflict (id) do nothing;   -- a signup trigger may already have made the profile
    update public.profiles set full_name = v.full_name, role = v.role::public.user_role, technician_level = v.level,
           contact_number = v.phone, is_driver = v.is_driver, hire_date = v.hired, employment_status = v.emp_status,
           lifecycle_status = 'active', branch_id = (select id from public.office_locations where name = 'Pacita HQ'),
           has_sss_id = v.has_ids, has_philhealth_id = v.has_ids, has_pagibig_id = v.has_ids,
           has_nbi_clearance = v.has_ids, has_resume = true, has_medical_clearance = v.has_medical
     where id = pg_temp.sid(0, v.n);
  end loop;
end $$;

-- 3. Attendance: the last 12 workdays (Mon–Sat) plus today --------------------------------------------
do $$
declare
  staff text[] := array['senior', 'technician', 'helper', 'mark', 'joel', 'rico', 'allan', 'jerome'];
  d date;
  day_no int := 0;   -- 1 = oldest workday
  s int;
  person uuid;
  username text;
  t_in timestamptz;
  t_out timestamptz;
  n int := 0;
  mocked boolean;
  fence text;
  lat double precision;
  lon double precision;
begin
  for d in
    select x from (
      select g::date x from generate_series(pg_temp.today() - 18, pg_temp.today() - 1, interval '1 day') g
      where extract(isodow from g) <> 7 order by g desc limit 12
    ) w order by x
  loop
    day_no := day_no + 1;
    for s in 1 .. array_length(staff, 1) loop
      -- Days with no punch: Pedro absent on day 5; Jerome on approved sick leave on days 8 and 9.
      continue when staff[s] = 'helper' and day_no = 5;
      continue when staff[s] = 'jerome' and day_no in (8, 9);

      person := pg_temp.who(staff[s]);
      -- On time: 7:40–8:09. Four late arrivals (8:25–8:47).
      t_in := pg_temp.at(d, time '07:40' + make_interval(mins => abs(hashtext(staff[s] || d::text)) % 30));
      if (staff[s], day_no) in (('technician', 2), ('mark', 6), ('helper', 9), ('technician', 11)) then
        t_in := pg_temp.at(d, time '08:25' + make_interval(mins => abs(hashtext(d::text || staff[s])) % 23));
      end if;
      t_out := pg_temp.at(d, time '17:00' + make_interval(mins => abs(hashtext(d::text || staff[s] || 'out')) % 90));

      mocked := staff[s] = 'joel' and day_no = 4;                        -- fake-GPS app detected
      fence := case when staff[s] = 'allan' and day_no = 7 then 'outside' else 'inside' end;
      lat := 14.3439 + ((abs(hashtext(staff[s] || d::text || 'lat')) % 60) - 30) / 100000.0;
      lon := 121.0617 + ((abs(hashtext(staff[s] || d::text || 'lon')) % 60) - 30) / 100000.0;
      if fence = 'outside' then lat := 14.3612; lon := 121.0473; end if;  -- about 2.5 km from Pacita HQ

      n := n + 1;
      insert into public.attendance_logs (id, technician_id, app_time_in, app_time_out, total_hours, created_at,
                                          latitude, longitude, gps_accuracy, geofence_status, is_mocked, is_suspicious,
                                          photo_status, status, verified_with_machine)
      values (pg_temp.sid(1, n), person, t_in, t_out, round(extract(epoch from t_out - t_in) / 3600.0, 2), t_in,
              lat, lon, 8 + abs(hashtext(staff[s] || d::text)) % 12, fence, mocked, mocked or fence = 'outside',
              case when mocked or fence = 'outside' then 'pending' else 'approved' end, 'closed', false);
    end loop;
  end loop;

  -- Today: five people timed in (everyone on today's jobs). Rico is on leave; Joel and Jerome are not in yet.
  foreach username in array array['senior', 'technician', 'helper', 'mark', 'allan'] loop
    n := n + 1;
    t_in := least(pg_temp.at(pg_temp.today(), time '07:45' + make_interval(mins => abs(hashtext(username)) % 20)),
                  now() - interval '10 minutes');
    insert into public.attendance_logs (id, technician_id, app_time_in, created_at, latitude, longitude, gps_accuracy,
                                        geofence_status, photo_status, status)
    values (pg_temp.sid(1, n), pg_temp.who(username), t_in, t_in,
            14.3439 + (abs(hashtext(username)) % 40 - 20) / 100000.0, 121.0617 + (abs(hashtext(username || 'x')) % 40 - 20) / 100000.0,
            10, 'inside', 'pending', 'active');
  end loop;
end $$;

-- 4. Jobs -------------------------------------------------------------------------------------------------
-- (n, day offset, start, end, type, client, location, lat, lon, reporting, status, vip, project, lead, crew)
drop table if exists pg_temp.demo_jobs;
create temp table demo_jobs as
select * from (values
  (1,  0, '09:00', '12:00', 'on_site',     'Reyes residence',               'BF Homes, Parañaque',            14.4520, 121.0230, 'direct_to_site', 'in_progress', false, null, 'senior',     array['helper']),
  (2,  0, '13:30', '17:00', 'on_site',     'Sunrise Bakeshop',              'Alabang–Zapote Rd, Las Piñas',   14.4440, 120.9960, 'via_pacita_hq',  'scheduled',   false, null, 'senior',     array['helper']),
  (3,  0, '08:00', '17:00', 'office_duty', 'Shop work: duct fabrication',   'Pacita HQ',                      14.3439, 121.0617, 'via_pacita_hq',  'in_progress', false, null, 'allan',      array[]::text[]),
  (4,  0, '10:30', '14:00', 'on_site',     'Lim Dental Clinic',             'National Hwy, San Pedro, Laguna', 14.3590, 121.0560, 'direct_to_site', 'in_progress', true,  null, 'technician', array['mark']),
  (5,  1, '08:30', '16:00', 'on_site',     'Garcia residence',              'Southwoods, Biñan, Laguna',      14.3260, 121.0380, 'direct_to_site', 'scheduled',   false, null, 'joel',       array['jerome']),
  (6,  1, '09:00', '12:00', 'on_site',     'St. Joseph parish office',      'Poblacion, San Pedro, Laguna',   14.3640, 121.0580, 'via_pacita_hq',  'scheduled',   false, null, 'technician', array['helper']),
  (7,  2, '07:00', '18:00', 'deployment',  'Batangas beach resort',         'Nasugbu, Batangas',              14.0720, 120.6330, 'direct_to_site', 'scheduled',   false, 'Resort aircon installation (10 units)', 'senior', array['mark', 'allan']),
  (8,  3, '13:00', '17:00', 'on_site',     'Cruz townhouse',                'Alabang Hills, Muntinlupa',      14.4180, 121.0310, 'direct_to_site', 'scheduled',   false, null, 'joel',       array['rico']),
  (9,  4, '08:00', '12:00', 'on_site',     'Santos Hardware',               'Landayan, San Pedro, Laguna',    14.3510, 121.0650, 'via_pacita_hq',  'scheduled',   false, null, 'technician', array['jerome']),
  (10, -3, '08:30', '15:00', 'on_site',    'Lopez residence',               'Balibago, Sta. Rosa, Laguna',    14.2950, 121.1030, 'direct_to_site', 'completed',   false, null, 'senior',     array['helper']),
  (11, -5, '09:00', '17:00', 'on_site',    'Laguna warehouse',              'Sta. Rosa, Laguna',              14.3100, 121.1110, 'via_pacita_hq',  'completed',   false, null, 'joel',       array['allan', 'jerome']),
  (12, 2, '10:00', '13:00', 'on_site',     'Villanueva condo unit',         'Filinvest City, Alabang',        14.4170, 121.0390, 'direct_to_site', 'cancelled',   false, null, 'mark',       array[]::text[])
) j(n, day_offset, t_start, t_end, kind, client, place, lat, lon, reporting, status, vip, project, lead, crew);

insert into public.schedules (id, technician_id, client_name, location, start_time, end_time, is_vip_hook, created_at,
                              assignment_type, reporting_instruction, attendance_mode, attendance_tracking_mode,
                              geofence_lat, geofence_lon, geofence_radius, status, cancellation_reason, project_name,
                              target_review_date, updated_at)
select pg_temp.sid(2, j.n), pg_temp.who(j.lead), j.client, j.place,
       pg_temp.at(pg_temp.today() + j.day_offset, j.t_start::time),
       case when j.kind = 'deployment' then pg_temp.at(pg_temp.today() + j.day_offset + 1, j.t_end::time)
            else pg_temp.at(pg_temp.today() + j.day_offset, j.t_end::time) end,
       j.vip, now() - interval '7 days' + make_interval(hours => j.n),
       j.kind, j.reporting,
       case when j.kind = 'deployment' then 'out_of_town' when j.reporting = 'via_pacita_hq' then 'hq' else 'direct_dispatch' end,
       case when j.kind = 'deployment' then 'out_of_town' when j.reporting = 'via_pacita_hq' then 'pacita_hq' else 'direct_on_site' end,
       j.lat, j.lon, case when j.kind = 'office_duty' then 150 else 300 end, j.status,
       case when j.status = 'cancelled' then 'Client postponed. They will call to book a new date.' end,
       j.project,
       case when j.kind = 'deployment' then pg_temp.at(pg_temp.today() + j.day_offset + 1, time '18:00') end,
       now()
from demo_jobs j;

-- Lead + crew (the lead of a cancelled job is released). Office duty has no lead: like the app, the person
-- is set on the job and listed as crew.
insert into public.schedule_crew (id, schedule_id, technician_id, assignment_role, joined_at, released_at, status)
select pg_temp.sid(3, row_number() over (order by j.n, m.ord)::int), pg_temp.sid(2, j.n), pg_temp.who(m.username),
       m.role, s.start_time,
       case when j.status = 'cancelled' then s.start_time end,
       case when j.status = 'cancelled' then 'released' else 'active' end
from demo_jobs j
join public.schedules s on s.id = pg_temp.sid(2, j.n)
cross join lateral (
  select j.lead as username, case when j.kind = 'office_duty' then 'crew' else 'lead' end as role, 0 as ord where j.lead is not null
  union all
  select c, 'crew', o::int from unnest(j.crew) with ordinality as u(c, o)
) m;

-- Temporary workers on the VIP job and the warehouse job.
insert into public.schedule_casual_helpers (id, schedule_id, casual_helper_id)
select pg_temp.sid(5, x.n), pg_temp.sid(2, x.job), ch.id
from (values (1, 4, 'Rommel Bautista'), (2, 11, 'Danilo Magat')) x(n, job, helper_name)
join public.casual_helpers ch on ch.full_name = x.helper_name;

-- History: every job was created by the coordinator; one was moved, one cancelled, one got a VIP crew member.
insert into public.schedule_history (id, schedule_id, changed_by, action_type, previous_payload, new_payload, reason, created_at)
select pg_temp.sid(4, j.n), pg_temp.sid(2, j.n), pg_temp.who('coordinator'), 'created', null,
       jsonb_build_object('client_name', j.client, 'location', j.place, 'start_time', s.start_time, 'end_time', s.end_time),
       'New job', s.created_at
from demo_jobs j join public.schedules s on s.id = pg_temp.sid(2, j.n);

insert into public.schedule_history (id, schedule_id, changed_by, action_type, previous_payload, new_payload, reason, created_at)
values
  (pg_temp.sid(4, 101), pg_temp.sid(2, 9), pg_temp.who('coordinator'), 'rescheduled',
   jsonb_build_object('start_time', pg_temp.at(pg_temp.today() + 2, time '08:00'), 'end_time', pg_temp.at(pg_temp.today() + 2, time '12:00')),
   jsonb_build_object('start_time', pg_temp.at(pg_temp.today() + 4, time '08:00'), 'end_time', pg_temp.at(pg_temp.today() + 4, time '12:00')),
   'The client asked for a later day.', now() - interval '2 days'),
  (pg_temp.sid(4, 102), pg_temp.sid(2, 12), pg_temp.who('coordinator'), 'cancelled',
   jsonb_build_object('status', 'scheduled'), jsonb_build_object('status', 'cancelled'),
   'Client postponed. They will call to book a new date.', now() - interval '1 day'),
  (pg_temp.sid(4, 103), pg_temp.sid(2, 4), pg_temp.who('coordinator'), 'crew_added',
   null, jsonb_build_object('crew', 'Rommel Bautista (temporary worker)'),
   'Extra hands for the VIP squeeze-in.', now() - interval '3 hours');

-- 5. Leave requests -------------------------------------------------------------------------------------
do $$
declare
  old_days date[];
begin
  -- Jerome's sick days must match his missing punches (workdays 8 and 9 of the 12).
  select array_agg(x order by x) into old_days from (
    select x from (
      select g::date x from generate_series(pg_temp.today() - 18, pg_temp.today() - 1, interval '1 day') g
      where extract(isodow from g) <> 7 order by g desc limit 12
    ) w order by x offset 7 limit 2
  ) z;

  insert into public.leaves (id, technician_id, leave_type, start_date, end_date, reason, status, rejection_reason, created_at, updated_at)
  values
    (pg_temp.sid(6, 1), pg_temp.who('technician'), 'vacation', pg_temp.today() + 10, pg_temp.today() + 11,
     'Family reunion in Iloilo. I will be back for the Monday jobs.', 'pending', null, now() - interval '5 hours', now() - interval '5 hours'),
    (pg_temp.sid(6, 2), pg_temp.who('helper'), 'sick', pg_temp.today() + 1, pg_temp.today() + 1,
     'Dental surgery (tooth extraction). The clinic said to rest for one day.', 'pending', null, now() - interval '1 day', now() - interval '1 day'),
    (pg_temp.sid(6, 3), pg_temp.who('rico'), 'emergency', pg_temp.today(), pg_temp.today() + 1,
     'Family emergency in the province.', 'approved', null, now() - interval '1 day', now() - interval '20 hours'),
    (pg_temp.sid(6, 4), pg_temp.who('jerome'), 'sick', old_days[1], old_days[2],
     'Flu with high fever.', 'approved', null, old_days[1] - interval '12 hours', old_days[1]),
    (pg_temp.sid(6, 5), pg_temp.who('mark'), 'vacation', pg_temp.today() + 2, pg_temp.today() + 3,
     'Out-of-town trip with family.', 'rejected',
     'You are on the Batangas out-of-town job on those days. Please pick other dates.', now() - interval '3 days', now() - interval '2 days');
end $$;

-- 6. Overtime requests ----------------------------------------------------------------------------------
insert into public.overtime_requests (id, technician_id, request_date, requested_hours, reason, status, reviewed_by, reviewed_at, created_at)
values
  (pg_temp.sid(7, 1), pg_temp.who('senior'), pg_temp.today() - 3, 2.0, 'Lopez residence: the client added one more unit to install.', 'pending', null, null, now() - interval '3 days'),
  (pg_temp.sid(7, 2), pg_temp.who('technician'), pg_temp.today() - 1, 1.0, 'Waited for the client to arrive before we could start.', 'pending', null, null, now() - interval '20 hours'),
  (pg_temp.sid(7, 3), pg_temp.who('joel'), pg_temp.today() - 5, 1.5, 'Laguna warehouse: finished the last two units the same day.', 'approved',
   pg_temp.who('hr'), now() - interval '4 days', now() - interval '5 days');

-- 7. Tickets and their conversations --------------------------------------------------------------------
insert into public.tickets (id, employee_id, title, category, description, status, priority, assigned_to, handling_mode, created_at, updated_at, is_archived)
values
  (pg_temp.sid(8, 1), pg_temp.who('technician'), 'My time-out was not recorded', 'DTR Issue',
   'I timed out at 5:40 PM after the Lopez job but the app shows no time-out. My phone had no signal at the site.',
   'in_progress', 'medium', pg_temp.who('hr'), 'ADMIN', now() - interval '2 days', now() - interval '3 hours', false),
  (pg_temp.sid(8, 2), pg_temp.who('joel'), 'Vacuum pump does not hold vacuum', 'Equipment Issue',
   'The 5CFM vacuum pump I borrowed loses vacuum after 2 minutes. I think the seal is worn. I need a working one for the Garcia job tomorrow.',
   'open', 'high', null, 'AI', now() - interval '4 hours', now() - interval '4 hours', false),
  (pg_temp.sid(8, 3), pg_temp.who('helper'), 'How many leave days do I have left?', 'Others',
   'Good day po. How many vacation leave days do I still have this year?',
   'open', 'low', null, 'AI', now() - interval '40 minutes', now() - interval '40 minutes', false),
  (pg_temp.sid(8, 4), pg_temp.who('mark'), 'Late mark because of the SLEX accident', 'DTR Issue',
   'I was marked late but there was an accident on SLEX that morning. I left the house at 6:30 AM.',
   'resolved', 'medium', pg_temp.who('hr'), 'ADMIN', now() - interval '6 days', now() - interval '5 days', false);

-- The employee's first message is the ticket description (shown above the chat), so it isn't repeated here.
insert into public.ticket_comments (id, ticket_id, author_id, content, sender_role, is_internal, read_at, created_at)
values
  (pg_temp.sid(9, 2), pg_temp.sid(8, 1), pg_temp.who('hr'), 'Hi Juan, thanks for reporting. Was Ramon with you when you left the site? I will check with him.', 'admin', false, now() - interval '40 hours', now() - interval '46 hours'),
  (pg_temp.sid(9, 3), pg_temp.sid(8, 1), pg_temp.who('technician'), 'Yes po, Ramon drove us back to Pacita. We arrived around 6:15 PM.', 'technician', false, now() - interval '30 hours', now() - interval '40 hours'),
  (pg_temp.sid(9, 4), pg_temp.sid(8, 1), pg_temp.who('hr'), 'Ramon confirmed. Correct the time-out to 5:40 PM in DTR & Attendance.', 'admin', true, null, now() - interval '3 hours'),
  (pg_temp.sid(9, 8), pg_temp.sid(8, 4), pg_temp.who('hr'), 'We saw the SLEX advisory for that morning. The late mark stays in the DTR, but it will not count toward the tardiness review.', 'admin', false, now() - interval '5 days', now() - interval '5 days' - interval '1 hour'),
  (pg_temp.sid(9, 9), pg_temp.sid(8, 4), pg_temp.who('hr'), E'Resolved by HR.\n\nThe late mark is excused for the tardiness count.', 'admin', false, now() - interval '5 days', now() - interval '5 days');

-- 8. Tool borrowings ------------------------------------------------------------------------------------
insert into public.tool_borrowings (id, tool_id, technician_id, quantity, status, handed_over_at, returned_at,
                                    condition_on_return, condition_notes, damage_fee, received_by, notes)
select pg_temp.sid(10, b.n), t.id, pg_temp.who(b.username), 1, b.status,
       pg_temp.at(pg_temp.today() + b.out_day, time '07:30'),
       case when b.back_day is not null then pg_temp.at(pg_temp.today() + b.back_day, time '17:30') end,
       b.cond, b.cond_notes, b.fee,
       case when b.back_day is not null then pg_temp.who('coordinator') end, b.notes
from (values
  (1, 'Vacuum Pump 5CFM',            'joel',       'checked_out', -1, null::int, null, null, 0, 'For the Garcia job'),
  (2, 'Digital Manifold Gauge',      'technician', 'checked_out', -5, null,      null, null, 0, null),
  (3, 'DeWalt 20V Max Hammer Drill', 'senior',     'checked_out',  0, null,      null, null, 0, 'Reyes residence'),
  (4, 'Clamp Multimeter',            'allan',      'damaged',     -8, -6,        'damaged', 'Screen cracked after it fell from the ladder.', 1500, null),
  (5, 'Eccentric Cone Flaring Tool', 'jerome',     'lost',        -10, -7,       'lost', 'Left at the Laguna warehouse site; not found.', 800, null),
  (6, 'Milwaukee M18 Impact Wrench', 'mark',       'returned',    -4, -3,        'good', null, 0, null)
) b(n, tool_name, username, status, out_day, back_day, cond, cond_notes, fee, notes)
join public.tools t on t.name = b.tool_name;

-- Available stock = total minus what is out now (the same rule the app keeps: a lost or damaged tool has
-- already left the total, see 20261118205911_inventory_check_in_in_one_step).
update public.tools t
set available_stock = greatest(0, t.total_stock - coalesce((
      select sum(b.quantity) from public.tool_borrowings b
      where b.tool_id = t.id and b.status = 'checked_out'), 0))
where true;

-- 9. Announcements (no push) ----------------------------------------------------------------------------
insert into public.announcements (id, title, content, created_by, created_at, updated_at, priority, status, audience, scheduled_for, send_push, target_branch_id)
values
  (pg_temp.sid(11, 1), 'Office closed on Bonifacio Day',
   'The office and shop are closed on Monday, 30 November (Bonifacio Day). Jobs that day will be moved. Check your schedule in the app.',
   pg_temp.who('hr'), now() - interval '2 days', now() - interval '2 days', 'normal', 'published', 'all', null, false, null),
  (pg_temp.sid(11, 2), 'Safety reminder: ladders and harness',
   'Always use a harness when working above 2 meters, and have a crew member hold the ladder. Report broken ladders to the coordinator.',
   pg_temp.who('coordinator'), now() - interval '5 days', now() - interval '5 days', 'important', 'published', 'field_staff', null, false, null),
  (pg_temp.sid(11, 3), 'December cleaning schedule',
   'Year-end cleaning jobs start on 1 December. The coordinator will post crews per week.',
   pg_temp.who('coordinator'), now() - interval '1 day', now() - interval '1 day', 'normal', 'scheduled', 'all',
   pg_temp.at(pg_temp.today() + 3, time '09:00'), false, null),
  (pg_temp.sid(11, 4), 'Christmas party planning',
   'Draft: date, venue and budget for the office Christmas party.',
   pg_temp.who('ceo'), now() - interval '3 hours', now() - interval '3 hours', 'normal', 'draft', 'office_staff', null, false, null);

drop table if exists pg_temp.demo_jobs;
alter table public.tickets enable trigger on_ticket_created_or_updated;
alter table public.ticket_comments enable trigger on_ticket_comment_push;
alter table public.attendance_logs enable trigger trg_prevent_duplicate_clockins;
