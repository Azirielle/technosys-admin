-- Mobile sign-in for field staff (16 Nov 2026, decided by Andrew):
--   * Technicians and helpers sign in with their mobile number + a 4-digit PIN set by HR.
--     Supabase passwords need 6+ characters, so the PIN is checked here (pin_sign_in) and the
--     pin-login edge function then opens the session. Email/username + password stays for everyone.
--   * One registered phone per technician/helper. The first phone they sign in on is registered;
--     any other phone is blocked and can only ask HR to switch. Time-ins from an unregistered
--     phone are refused by the database, so nobody can time in for someone else on their own phone.

-- 1. PINs (hashed with bcrypt). No policies: only the functions below can read or write it.
create table public.login_pins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  set_by uuid references public.profiles(id) on delete set null
);
create index login_pins_set_by_idx on public.login_pins (set_by);
alter table public.login_pins enable row level security;

-- 2. The one phone each field worker may use (device_id = random id kept in the phone's secure storage)
create table public.registered_devices (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  device_id text not null,
  device_name text,
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.registered_devices enable row level security;
create policy "own phone or office" on public.registered_devices
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_office_staff()));

-- 3. Requests to switch to a new phone (HR approves or declines)
create table public.device_change_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  device_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz
);
create unique index device_change_requests_one_pending on public.device_change_requests (profile_id) where status = 'pending';
create index device_change_requests_profile_idx on public.device_change_requests (profile_id);
create index device_change_requests_decided_by_idx on public.device_change_requests (decided_by);
alter table public.device_change_requests enable row level security;
create policy "own requests or office" on public.device_change_requests
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_office_staff()));

-- 4. Every time-in says which phone it came from; field staff may only time in from their registered phone
alter table public.attendance_logs add column device_id text;

create or replace function public.check_registered_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- office staff, the demo seed and server jobs are not phones
  if auth.uid() is null or public.is_office_staff() then return new; end if;
  if not exists (
    select 1 from public.registered_devices d
    where d.profile_id = new.technician_id and d.device_id = new.device_id
  ) then
    raise exception 'This phone is not registered to you' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger check_registered_phone before insert on public.attendance_logs
  for each row execute function public.check_registered_phone();

-- Shared: register / compare a phone for one person. Returns registered | ok | other_phone.
create or replace function public.match_phone(p_profile_id uuid, p_device_id text, p_device_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_device text;
begin
  if length(coalesce(p_device_id, '')) < 16 then raise exception 'Invalid phone id'; end if;
  insert into public.registered_devices (profile_id, device_id, device_name)
  values (p_profile_id, p_device_id, left(p_device_name, 80))
  on conflict (profile_id) do nothing;
  if found then return 'registered'; end if;

  select device_id into v_device from public.registered_devices where profile_id = p_profile_id;
  if v_device = p_device_id then
    update public.registered_devices set last_seen_at = now() where profile_id = p_profile_id;
    return 'ok';
  end if;
  return 'other_phone';
end;
$$;
revoke execute on function public.match_phone(uuid, text, text) from public, anon, authenticated;

-- Shared: one pending "switch to this phone" request per person (a new one replaces the old)
create or replace function public.file_phone_change(p_profile_id uuid, p_device_id text, p_device_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.device_change_requests where profile_id = p_profile_id and status = 'pending';
  insert into public.device_change_requests (profile_id, device_id, device_name)
  values (p_profile_id, p_device_id, left(p_device_name, 80));
end;
$$;
revoke execute on function public.file_phone_change(uuid, text, text) from public, anon, authenticated;

-- 5. Called by the app right after an email/username sign-in. Office staff aren't tied to a phone.
create or replace function public.claim_my_phone(p_device_id text, p_device_name text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.my_role() not in ('technician', 'helper') then return 'ok'; end if;
  return public.match_phone(auth.uid(), p_device_id, p_device_name);
end;
$$;
revoke execute on function public.claim_my_phone(text, text) from public, anon;
grant execute on function public.claim_my_phone(text, text) to authenticated;

create or replace function public.request_my_phone_change(p_device_id text, p_device_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.my_role() not in ('technician', 'helper') then
    raise exception 'Only field staff register phones';
  end if;
  if length(coalesce(p_device_id, '')) < 16 then raise exception 'Invalid phone id'; end if;
  perform public.file_phone_change(auth.uid(), p_device_id, p_device_name);
end;
$$;
revoke execute on function public.request_my_phone_change(text, text) from public, anon;
grant execute on function public.request_my_phone_change(text, text) to authenticated;

-- 6. Mobile number + PIN check, used only by the pin-login edge function (service role).
--    5 wrong PINs lock the PIN for 15 minutes. The phone is checked only after a correct PIN.
create or replace function public.pin_sign_in(
  p_contact text, p_pin text, p_device_id text, p_device_name text, p_request_change boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_number text;
  v_id uuid; v_role text; v_status text; v_email text;
  v_pin public.login_pins%rowtype;
  v_tries int;
  v_phone text;
begin
  begin
    v_number := public.normalize_ph_mobile(p_contact);
  exception when others then
    return jsonb_build_object('status', 'bad_number');
  end;
  if v_number is null then return jsonb_build_object('status', 'bad_number'); end if;

  select p.id, p.role, p.lifecycle_status, u.email into v_id, v_role, v_status, v_email
  from public.profiles p join auth.users u on u.id = p.id
  where p.contact_number = v_number limit 1;
  if v_id is null then return jsonb_build_object('status', 'unknown_number'); end if;
  if v_role not in ('technician', 'helper') then return jsonb_build_object('status', 'use_email'); end if;
  if v_status not in ('active', 'on_leave') then return jsonb_build_object('status', 'inactive'); end if;

  select * into v_pin from public.login_pins where profile_id = v_id for update;
  if not found then return jsonb_build_object('status', 'no_pin'); end if;
  if v_pin.locked_until is not null and v_pin.locked_until > now() then
    return jsonb_build_object('status', 'locked',
      'minutes', greatest(1, ceil(extract(epoch from v_pin.locked_until - now()) / 60)::int));
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4}$' or extensions.crypt(p_pin, v_pin.pin_hash) <> v_pin.pin_hash then
    v_tries := v_pin.failed_attempts + 1;
    if v_tries >= 5 then
      update public.login_pins set failed_attempts = 0, locked_until = now() + interval '15 minutes' where profile_id = v_id;
      return jsonb_build_object('status', 'locked', 'minutes', 15);
    end if;
    update public.login_pins set failed_attempts = v_tries, locked_until = null where profile_id = v_id;
    return jsonb_build_object('status', 'wrong_pin', 'tries_left', 5 - v_tries);
  end if;
  update public.login_pins set failed_attempts = 0, locked_until = null where profile_id = v_id;

  v_phone := public.match_phone(v_id, p_device_id, p_device_name);
  if v_phone = 'other_phone' then
    if p_request_change then
      perform public.file_phone_change(v_id, p_device_id, p_device_name);
      return jsonb_build_object('status', 'change_requested');
    end if;
    return jsonb_build_object('status', 'other_phone');
  end if;
  return jsonb_build_object('status', v_phone, 'email', v_email);
end;
$$;
revoke execute on function public.pin_sign_in(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.pin_sign_in(text, text, text, text, boolean) to service_role;

-- 7. HR (and the CEO) manage PINs and phones from the admin 201 file
create or replace function public.set_login_pin(p_profile_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() not in ('hr', 'ceo') then raise exception 'Only HR can set PINs'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then raise exception 'The PIN must be 4 numbers'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and role in ('technician', 'helper')) then
    raise exception 'PINs are for technicians and helpers';
  end if;
  insert into public.login_pins (profile_id, pin_hash, set_by)
  values (p_profile_id, extensions.crypt(p_pin, extensions.gen_salt('bf')), auth.uid())
  on conflict (profile_id) do update
    set pin_hash = excluded.pin_hash, set_by = excluded.set_by, failed_attempts = 0, locked_until = null, updated_at = now();
end;
$$;
revoke execute on function public.set_login_pin(uuid, text) from public, anon;
grant execute on function public.set_login_pin(uuid, text) to authenticated;

-- Has this person got a PIN, and is it locked? (HR's 201 file; never returns the PIN)
create or replace function public.login_pin_status(p_profile_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.my_role() not in ('hr', 'ceo') then null else
    (select jsonb_build_object('has_pin', true, 'updated_at', updated_at,
       'locked', locked_until is not null and locked_until > now())
     from public.login_pins where profile_id = p_profile_id)
  end;
$$;
revoke execute on function public.login_pin_status(uuid) from public, anon;
grant execute on function public.login_pin_status(uuid) to authenticated;

create or replace function public.decide_phone_change(p_request_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_req public.device_change_requests%rowtype;
begin
  if public.my_role() not in ('hr', 'ceo') then raise exception 'Only HR can approve phones'; end if;
  select * into v_req from public.device_change_requests where id = p_request_id and status = 'pending' for update;
  if not found then raise exception 'This request was already handled'; end if;
  if p_approve then
    insert into public.registered_devices (profile_id, device_id, device_name)
    values (v_req.profile_id, v_req.device_id, v_req.device_name)
    on conflict (profile_id) do update
      set device_id = excluded.device_id, device_name = excluded.device_name, registered_at = now(), last_seen_at = now();
  end if;
  update public.device_change_requests
    set status = case when p_approve then 'approved' else 'declined' end, decided_by = auth.uid(), decided_at = now()
    where id = p_request_id;
end;
$$;
revoke execute on function public.decide_phone_change(uuid, boolean) from public, anon;
grant execute on function public.decide_phone_change(uuid, boolean) to authenticated;

-- Forget the registered phone: the next phone they sign in on is registered
create or replace function public.reset_registered_phone(p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role() not in ('hr', 'ceo') then raise exception 'Only HR can reset phones'; end if;
  delete from public.registered_devices where profile_id = p_profile_id;
  delete from public.device_change_requests where profile_id = p_profile_id and status = 'pending';
end;
$$;
revoke execute on function public.reset_registered_phone(uuid) from public, anon;
grant execute on function public.reset_registered_phone(uuid) to authenticated;

-- 8. Demo PINs (demo only): the last 4 digits of each field account's mobile number,
--    e.g. Ramon Santos 09171234501 → PIN 4501. HR changes them in the 201 file.
insert into public.login_pins (profile_id, pin_hash)
select id, extensions.crypt(right(contact_number, 4), extensions.gen_salt('bf'))
from public.profiles
where role in ('technician', 'helper') and contact_number is not null
on conflict (profile_id) do nothing;
