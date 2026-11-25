-- Brief 10: on-site crews check in at the Pacita office (face check there); time starts on arrival at the site.
-- 2. New jobs site_radius_m default 75
alter table public.jobs alter column site_radius_m set default 75;

-- 3. Office check-ins table
create table if not exists public.office_check_ins (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  checked_in_at timestamptz not null default now(),
  lat double precision,
  lon double precision,
  accuracy_m double precision,
  selfie_path text,
  face_score real check (face_score between -1 and 1),
  face_check text check (face_check in ('match', 'mismatch', 'no_liveness', 'not_enrolled')),
  constraint office_check_ins_person_date_key unique (person_id, work_date)
);

alter table public.office_check_ins enable row level security;

drop policy if exists "read own office check in" on public.office_check_ins;
create policy "read own office check in" on public.office_check_ins for select to authenticated
  using (person_id = (select auth.uid()));

drop policy if exists "office staff read all office check ins" on public.office_check_ins;
create policy "office staff read all office check ins" on public.office_check_ins for select to authenticated
  using ((select public.my_role()) in ('hr', 'ceo', 'coordinator', 'operations'));
