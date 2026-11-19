-- Technicians and helpers make their own sign-in PIN (like GCash's MPIN). A PIN HR sets is temporary: the phone's
-- first-time setup asks for an own PIN until login_pins.set_by is the person themself (so after an HR reset too).
-- Changing an own PIN needs the current one; replacing HR's temporary PIN doesn't (they just signed in with it).

-- Is my PIN my own (not HR's temporary one)? false when there's no PIN.
create or replace function public.my_pin_is_own()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select set_by = auth.uid() from public.login_pins where profile_id = auth.uid()), false);
$$;
revoke execute on function public.my_pin_is_own() from public, anon;
grant execute on function public.my_pin_is_own() to authenticated;

create or replace function public.set_my_pin(p_new text, p_current text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.login_pins%rowtype;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if public.my_role() not in ('technician', 'helper') then return jsonb_build_object('status', 'not_field_staff'); end if;
  if coalesce(p_new, '') !~ '^[0-9]{4}$' then return jsonb_build_object('status', 'bad_format'); end if;
  -- Same rule as HR's PIN form: no 1111-style or 1234-style PINs
  if p_new ~ '^(\d)\1{3}$' or p_new in ('1234', '4321', '0123', '9876') then return jsonb_build_object('status', 'weak'); end if;

  select * into v_row from public.login_pins where profile_id = v_uid for update;
  if found and v_row.set_by = v_uid
     and (p_current is null or v_row.pin_hash <> extensions.crypt(p_current, v_row.pin_hash)) then
    return jsonb_build_object('status', 'wrong_current');
  end if;

  insert into public.login_pins (profile_id, pin_hash, set_by)
  values (v_uid, extensions.crypt(p_new, extensions.gen_salt('bf')), v_uid)
  on conflict (profile_id) do update
    set pin_hash = excluded.pin_hash, set_by = v_uid, failed_attempts = 0, locked_until = null, updated_at = now();
  return jsonb_build_object('status', 'saved');
end;
$$;
revoke execute on function public.set_my_pin(text, text) from public, anon;
grant execute on function public.set_my_pin(text, text) to authenticated;
