-- Five more demo technicians (Andrew, 19 Nov). Same setup as the demo roster: a login (username = password, demo
-- only), a profile at Pacita HQ, and a sign-in PIN for the app. Mobile number + PIN: 09111111111 / 1111,
-- 09222222222 / 2222, 09333333333 / 3333, 09444444444 / 4444, 09555555555 / 5555.
do $$
declare
  v record;
  v_id uuid;
begin
  for v in select * from (values
    ('nherie',    'Nherie Anne Ferreras',  '09111111111', '1111'),
    ('glori',     'Glori John Gozo',       '09222222222', '2222'),
    ('christine', 'Christine Joy Almajar', '09333333333', '3333'),
    ('jemira',    'Jemira Berdin',         '09444444444', '4444'),
    ('cristina',  'Cristina Ranara',       '09555555555', '5555')
  ) t(username, full_name, phone, pin) loop
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
            v.username || '@technocycle.ph', extensions.crypt(v.username, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v.full_name, 'role', 'technician'),
            now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, 'email',
            jsonb_build_object('sub', v_id::text, 'email', v.username || '@technocycle.ph', 'email_verified', true),
            now(), now(), now());
    insert into public.profiles (id, full_name, role, technician_level, contact_number, is_driver, hire_date,
                                 employment_status, lifecycle_status, branch_id,
                                 has_sss_id, has_philhealth_id, has_pagibig_id, has_nbi_clearance, has_resume, has_medical_clearance)
    values (v_id, v.full_name, 'technician'::public.user_role, 'technician', v.phone, false, current_date,
            'regular', 'active', (select id from public.office_locations where name = 'Pacita HQ'),
            true, true, true, true, true, true);
    insert into public.login_pins (profile_id, pin_hash)
    values (v_id, extensions.crypt(v.pin, extensions.gen_salt('bf')));
  end loop;
end $$;
