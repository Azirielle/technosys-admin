-- Rescue step 5: three office roles only, one demo login per job, one site.
-- Office: CEO, HR, Coordinator (Service Dept.). The Accountant role is removed (DTR processing is done by HR).
-- Field: one Senior Technician, one Technician, one Helper. Logins are username = password (demo only).

-- 1. One site: Pacita HQ ------------------------------------------------------------------------------
update public.profiles set branch_id = (select id from public.office_locations where name = 'Pacita HQ');
delete from public.announcements where target_branch_id in (select id from public.office_locations where name <> 'Pacita HQ');
update public.documents set branch_id = null where branch_id in (select id from public.office_locations where name <> 'Pacita HQ');
delete from public.office_locations where name <> 'Pacita HQ';

-- 2. Deleting a person cleans up after itself from now on --------------------------------------------
alter table public.employee_warnings
  drop constraint if exists employee_warnings_employee_id_fkey,
  add constraint employee_warnings_employee_id_fkey foreign key (employee_id) references auth.users(id) on delete cascade,
  drop constraint if exists employee_warnings_service_dept_reviewer_id_fkey,
  add constraint employee_warnings_service_dept_reviewer_id_fkey foreign key (service_dept_reviewer_id) references auth.users(id) on delete set null,
  drop constraint if exists employee_warnings_last_edited_by_fkey,
  add constraint employee_warnings_last_edited_by_fkey foreign key (last_edited_by) references auth.users(id) on delete set null;
alter table public.push_notifications_queue
  drop constraint if exists push_notifications_queue_user_id_fkey,
  add constraint push_notifications_queue_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.app_versions
  drop constraint if exists app_versions_created_by_fkey,
  add constraint app_versions_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.announcements
  drop constraint if exists announcements_last_edited_by_fkey,
  add constraint announcements_last_edited_by_fkey foreign key (last_edited_by) references public.profiles(id) on delete set null;
alter table public.schedule_history
  drop constraint if exists schedule_history_changed_by_fkey,
  add constraint schedule_history_changed_by_fkey foreign key (changed_by) references public.profiles(id) on delete set null;
alter table public.tool_borrowings
  drop constraint if exists tool_borrowings_received_by_fkey,
  add constraint tool_borrowings_received_by_fkey foreign key (received_by) references public.profiles(id) on delete set null;

-- 3. Remove everyone except the three office accounts ----------------------------------------------
create temp table removed_users on commit drop as
select id from auth.users where email not in ('ceo@technocycle.ph', 'hr@technocycle.ph', 'coordinator@technocycle.ph');

delete from public.employee_warnings where issued_by in (select id from removed_users);
delete from public.attendance_corrections where corrected_by in (select id from removed_users);
delete from public.temporary_access where granted_by in (select id from removed_users);
delete from auth.users where id in (select id from removed_users);   -- profiles and their records follow (cascade)

-- 4. Roles: ceo, hr, coordinator, technician, helper ------------------------------------------------
alter table backup_20261113.profiles alter column role type text;   -- no-op if already text
create type public.staff_role as enum ('ceo', 'hr', 'coordinator', 'technician', 'helper');
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.staff_role using role::text::public.staff_role;
alter table public.profiles alter column role set default 'technician';
drop type public.user_role;
alter type public.staff_role rename to user_role;

create or replace function public.is_office_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('ceo', 'hr', 'coordinator'), false);
$$;

create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;                 -- server code / SQL editor
  if public.is_ceo_or_hr() then
    if public.my_role() = 'hr' and new.role is distinct from old.role
       and (new.role::text in ('ceo','hr','coordinator') or old.role::text in ('ceo','hr','coordinator')) then
      raise exception 'Only the CEO can change office roles';
    end if;
    return new;
  end if;
  if (new.role, new.lifecycle_status, new.employment_status, new.technician_level, new.branch_id,
      new.manager_id, new.is_driver, new.hire_date, new.has_sss_id, new.has_philhealth_id, new.has_pagibig_id,
      new.has_nbi_clearance, new.has_resume, new.has_medical_clearance)
     is distinct from
     (old.role, old.lifecycle_status, old.employment_status, old.technician_level, old.branch_id,
      old.manager_id, old.is_driver, old.hire_date, old.has_sss_id, old.has_philhealth_id, old.has_pagibig_id,
      old.has_nbi_clearance, old.has_resume, old.has_medical_clearance) then
    raise exception 'Only HR can change employment details';
  end if;
  return new;
end;
$$;

-- 5. Philippine mobile numbers: always stored as 11 digits (09XXXXXXXXX) --------------------------
create or replace function public.normalize_ph_mobile(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d ~ '^09\d{9}$' then d
    when d ~ '^639\d{9}$' then '0' || substr(d, 3)
    when d ~ '^9\d{9}$' then '0' || d
    else nullif(d, '')
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

create or replace function public.normalize_contact_number()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.contact_number := public.normalize_ph_mobile(new.contact_number);
  return new;
end;
$$;
revoke execute on function public.normalize_contact_number() from public, anon, authenticated;

create trigger normalize_contact_number before insert or update of contact_number on public.profiles
  for each row execute function public.normalize_contact_number();

alter table public.profiles add constraint profiles_contact_number_format
  check (contact_number is null or contact_number ~ '^09\d{9}$');

-- Mobile login: accepts 09123456789, +639123456789 or 9123456789. Only active staff are found.
create or replace function public.get_email_from_contact(p_contact text)
returns text language sql stable security definer set search_path = '' as $$
  select u.email from auth.users u join public.profiles p on p.id = u.id
  where p.contact_number = public.normalize_ph_mobile(p_contact)
    and p.lifecycle_status in ('active', 'on_leave')
  limit 1;
$$;
revoke execute on function public.get_email_from_contact(text) from public;
grant execute on function public.get_email_from_contact(text) to anon, authenticated;

-- 6. Demo logins (username = password) ---------------------------------------------------------------
update auth.users set encrypted_password = extensions.crypt(split_part(email, '@', 1), extensions.gen_salt('bf')), updated_at = now()
where email in ('ceo@technocycle.ph', 'hr@technocycle.ph', 'coordinator@technocycle.ph');

update public.profiles p set full_name = v.full_name, employment_status = 'regular', technician_level = null, is_driver = false
from (values ('ceo@technocycle.ph', 'Carlos Mendoza'), ('hr@technocycle.ph', 'Helena Garcia'),
             ('coordinator@technocycle.ph', 'Aileen Bautista')) v(email, full_name)
join auth.users u on u.email = v.email
where p.id = u.id;

do $$
declare
  v record;
  v_id uuid;
begin
  for v in select * from (values
    ('senior',     'Ramon Santos',   'technician', 'senior',     '09171234501', true,  date '2019-03-01'),
    ('technician', 'Juan Dela Cruz', 'technician', 'technician', '09123456789', false, date '2022-06-15'),
    ('helper',     'Pedro Reyes',    'helper',     'helper',     '09171234503', false, date '2025-01-10')
  ) t(username, full_name, role, level, phone, is_driver, hired) loop
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
            v.username || '@technocycle.ph', extensions.crypt(v.username, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v.full_name, 'role', v.role),
            now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, 'email',
            jsonb_build_object('sub', v_id::text, 'email', v.username || '@technocycle.ph', 'email_verified', true),
            now(), now(), now());
    insert into public.profiles (id, full_name, role, technician_level, contact_number, is_driver, hire_date,
                                 employment_status, lifecycle_status, branch_id,
                                 has_sss_id, has_philhealth_id, has_pagibig_id, has_nbi_clearance, has_resume, has_medical_clearance)
    values (v_id, v.full_name, v.role::public.user_role, v.level, v.phone, v.is_driver, v.hired,
            case when v.level = 'helper' then 'provisionary' else 'regular' end, 'active',
            (select id from public.office_locations where name = 'Pacita HQ'),
            true, true, true, true, true, v.level <> 'helper');
  end loop;
end $$;
