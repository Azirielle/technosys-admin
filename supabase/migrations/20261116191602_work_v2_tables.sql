-- Work v2, part 1: the new job and attendance tables (17 Nov 2026, plan: docs/job-workflow-sketch.html).
-- Added beside the current schedules / attendance_logs; nothing reads these until the switch-over.
--   vehicles       company vehicles (a driver brings one back to its home office before timing out)
--   jobs           one job, possibly several days; where the crew reports (site or HQ) and the time-in circle
--   job_members    who is on a job: lead, crew, driver (with a vehicle), helper; or a temporary worker
--   work_days      one per person per day: time-in, time-out, how each was checked, late minutes, status
--   job_events     arrived, done, moved, cancelled, crew changed, acting lead
--   reviews        what HR or the Coordinator must look at (selfie time-ins, no time-out, Coordinator time-outs…)
-- Writes from the apps go through database functions (part 2), so the rules can't be skipped.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate text not null unique,
  home_office_id uuid not null references public.office_locations(id),
  status text not null default 'active' check (status in ('active', 'in_repair', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_home_office_idx on public.vehicles (home_office_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (length(trim(client_name)) > 0),
  address text not null check (length(trim(address)) > 0),
  project_name text,
  notes text,
  site_lat double precision not null check (site_lat between -90 and 90),
  site_lon double precision not null check (site_lon between -180 and 180),
  site_radius_m integer not null default 150 check (site_radius_m between 30 and 2000),
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  work_type text not null default 'on_site' check (work_type in ('on_site', 'out_of_town', 'office')),
  report_to text not null default 'site' check (report_to in ('site', 'hq')),
  hq_office_id uuid references public.office_locations(id),
  status text not null default 'planned' check (status in ('planned', 'ongoing', 'done', 'cancelled')),
  cancel_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legacy_schedule_id uuid unique,             -- the old schedules row it was moved from
  constraint jobs_dates_in_order check (end_date >= start_date),
  constraint jobs_times_in_order check (end_time > start_time),
  constraint jobs_hq_needs_office check (report_to = 'site' or hq_office_id is not null),
  constraint jobs_cancel_needs_reason check (status <> 'cancelled' or length(trim(coalesce(cancel_reason, ''))) >= 5)
);
create index jobs_dates_idx on public.jobs (start_date, end_date) where status <> 'cancelled';
create index jobs_hq_office_idx on public.jobs (hq_office_id);
create index jobs_created_by_idx on public.jobs (created_by);

create table public.job_members (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  person_id uuid references public.profiles(id) on delete cascade,
  temp_worker_id uuid references public.casual_helpers(id) on delete cascade,
  role text not null check (role in ('lead', 'crew', 'driver', 'helper')),
  vehicle_id uuid references public.vehicles(id),
  is_acting_lead boolean not null default false,
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint job_members_one_kind check ((person_id is null) <> (temp_worker_id is null)),
  constraint job_members_vehicle_for_drivers check (vehicle_id is null or role = 'driver'),
  constraint job_members_temp_not_lead check (temp_worker_id is null or role in ('crew', 'helper'))
);
create unique index job_members_one_person on public.job_members (job_id, person_id) where removed_at is null and person_id is not null;
create unique index job_members_one_temp on public.job_members (job_id, temp_worker_id) where removed_at is null and temp_worker_id is not null;
create unique index job_members_one_lead on public.job_members (job_id) where removed_at is null and role = 'lead';
create index job_members_person_idx on public.job_members (person_id) where removed_at is null;
create index job_members_temp_idx on public.job_members (temp_worker_id);
create index job_members_vehicle_idx on public.job_members (vehicle_id);

create table public.work_days (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,                                  -- Manila date
  job_id uuid references public.jobs(id) on delete set null, -- null = office duty at HQ
  place text not null check (place in ('site', 'hq')),
  place_name text not null,
  time_in timestamptz not null default now(),               -- server time
  counted_from timestamptz not null,                        -- the job's start when early, else time_in
  late_minutes integer not null default 0 check (late_minutes >= 0),
  in_lat double precision, in_lon double precision, in_accuracy_m double precision,
  in_distance_m integer,
  in_check text not null check (in_check in ('inside', 'selfie', 'queued')),
  in_reason text,
  selfie_path text,
  is_mocked boolean not null default false,
  device_id text,
  time_out timestamptz,
  out_lat double precision, out_lon double precision,
  out_check text check (out_check in ('at_site', 'away', 'at_hq', 'by_coordinator', 'told_later')),
  hours numeric(4, 1),
  status text not null default 'working' check (status in ('working', 'done', 'no_time_out', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legacy_log_id uuid unique,
  constraint work_days_one_per_day unique (person_id, work_date),
  constraint work_days_out_after_in check (time_out is null or time_out > time_in),
  constraint work_days_selfie_has_reason check (in_check <> 'selfie' or (selfie_path is not null and in_reason is not null))
);
create index work_days_date_idx on public.work_days (work_date);
create index work_days_job_idx on public.work_days (job_id);
create index work_days_open_idx on public.work_days (person_id) where time_out is null;

create table public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  kind text not null check (kind in ('created', 'arrived', 'done', 'moved', 'cancelled', 'crew_changed', 'acting_lead', 'finished')),
  person_id uuid references public.profiles(id) on delete set null,   -- whose arrival / done
  work_day_id uuid references public.work_days(id) on delete set null,
  by_id uuid references public.profiles(id) on delete set null,        -- who did it
  at timestamptz not null default now(),
  lat double precision, lon double precision,
  reason text,
  details jsonb not null default '{}'::jsonb
);
create index job_events_job_idx on public.job_events (job_id, at desc);
create index job_events_person_idx on public.job_events (person_id);
create index job_events_work_day_idx on public.job_events (work_day_id);
create index job_events_by_idx on public.job_events (by_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references public.work_days(id) on delete cascade,
  kind text not null check (kind in ('selfie_time_in', 'fake_gps', 'no_time_out', 'told_later', 'coordinator_time_out', 'driver_away')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  note text,
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz
);
create index reviews_pending_idx on public.reviews (created_at) where status = 'pending';
create index reviews_work_day_idx on public.reviews (work_day_id);
create index reviews_decided_by_idx on public.reviews (decided_by);

-- Overtime is asked per work day and approved by the Coordinator (HR sees and can correct it)
alter table public.overtime_requests add column work_day_id uuid references public.work_days(id) on delete cascade;
create index overtime_requests_work_day_idx on public.overtime_requests (work_day_id);

-- Is the signed-in person on this job? (used by the access rules; avoids rules that read their own table)
create or replace function public.is_on_job(p_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.job_members
    where job_id = p_job_id and person_id = (select auth.uid()) and removed_at is null
  );
$$;
revoke execute on function public.is_on_job(uuid) from public, anon;
grant execute on function public.is_on_job(uuid) to authenticated;

-- Access rules. Office staff read everything; field staff read their own jobs and days.
-- Field staff never write these tables directly: time-in, time-out, Arrived/Done go through functions.
alter table public.vehicles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_members enable row level security;
alter table public.work_days enable row level security;
alter table public.job_events enable row level security;
alter table public.reviews enable row level security;

create policy "signed-in read vehicles" on public.vehicles for select to authenticated using (true);
create policy "coordinator manages vehicles" on public.vehicles for all to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo')) with check ((select public.my_role()) in ('coordinator', 'ceo'));

create policy "office or crew read jobs" on public.jobs for select to authenticated
  using ((select public.is_office_staff()) or public.is_on_job(id));
create policy "coordinator manages jobs" on public.jobs for all to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo')) with check ((select public.my_role()) in ('coordinator', 'ceo'));

create policy "office or crew read members" on public.job_members for select to authenticated
  using ((select public.is_office_staff()) or public.is_on_job(job_id));
create policy "coordinator manages members" on public.job_members for all to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo')) with check ((select public.my_role()) in ('coordinator', 'ceo'));

create policy "own or office read work days" on public.work_days for select to authenticated
  using (person_id = (select auth.uid()) or (select public.is_office_staff()));

create policy "office or crew read job events" on public.job_events for select to authenticated
  using ((select public.is_office_staff()) or public.is_on_job(job_id));

create policy "own or office read reviews" on public.reviews for select to authenticated
  using ((select public.is_office_staff())
    or exists (select 1 from public.work_days w where w.id = work_day_id and w.person_id = (select auth.uid())));
