-- First-time setup on the phone (16 Nov 2026, plan approved by Andrew):
--   Signing in no longer registers the phone. The technician registers it on purpose in setup
--   step 3 ("Use this as my work phone"), after agreeing to the app rules. Until then the
--   check_registered_phone trigger refuses their time-ins, so an unregistered phone can't be used.
--   Also: logged-out visitors can read the newest Terms and Privacy notice again (the old rule
--   only allowed the original ids, so the sign-in screen's links failed after the v1.1 versions).

-- Is this the person's phone? ok | unregistered | other_phone (never registers)
create or replace function public.phone_status(p_profile_id uuid, p_device_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_device text;
begin
  select device_id into v_device from public.registered_devices where profile_id = p_profile_id;
  if v_device is null then return 'unregistered'; end if;
  if v_device = p_device_id then
    update public.registered_devices set last_seen_at = now() where profile_id = p_profile_id;
    return 'ok';
  end if;
  return 'other_phone';
end;
$$;
revoke execute on function public.phone_status(uuid, text) from public, anon, authenticated;

-- PIN sign-in: same checks as before, but a first sign-in returns 'unregistered' instead of registering.
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
  if length(coalesce(p_device_id, '')) < 16 then return jsonb_build_object('status', 'error'); end if;

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

  v_phone := public.phone_status(v_id, p_device_id);
  if v_phone = 'other_phone' then
    if p_request_change then
      perform public.file_phone_change(v_id, p_device_id, p_device_name);
      return jsonb_build_object('status', 'change_requested');
    end if;
    return jsonb_build_object('status', 'other_phone');
  end if;
  return jsonb_build_object('status', v_phone, 'email', v_email); -- ok | unregistered
end;
$$;
revoke execute on function public.pin_sign_in(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.pin_sign_in(text, text, text, text, boolean) to service_role;

-- After any sign-in (and on app start): ok | unregistered | other_phone. Office staff: always ok.
create or replace function public.check_my_phone(p_device_id text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.my_role() not in ('technician', 'helper') then return 'ok'; end if;
  return public.phone_status(auth.uid(), p_device_id);
end;
$$;
revoke execute on function public.check_my_phone(text) from public, anon;
grant execute on function public.check_my_phone(text) to authenticated;

-- Setup step 3: "Use this as my work phone". registered | ok (already this phone) | other_phone
create or replace function public.register_my_phone(p_device_id text, p_device_name text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if public.my_role() not in ('technician', 'helper') then return 'ok'; end if;
  return public.match_phone(auth.uid(), p_device_id, p_device_name);
end;
$$;
revoke execute on function public.register_my_phone(text, text) from public, anon;
grant execute on function public.register_my_phone(text, text) to authenticated;

-- claim_my_phone registered on sign-in; replaced by check_my_phone + register_my_phone.
drop function public.claim_my_phone(text, text);

-- Logged-out visitors (sign-in screen) may read the newest Terms and Privacy notice, whatever its version id.
drop policy "public reads terms and privacy" on public.policies;
create policy "public reads terms and privacy" on public.policies
  for select to anon
  using (is_active and (id like 'terms_of_service%' or id like 'privacy_policy%'));
