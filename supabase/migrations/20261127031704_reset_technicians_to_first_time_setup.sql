-- Reset every technician to first-time setup before the 28 Nov defense (Andrew, 27 Nov; groupmates included):
--   temporary PIN 1111 set by nobody (so setup's "make your own PIN" step comes back), phone unlinked (setup's
--   "this phone" step registers it again), saved face deleted (setup's new "Save your face" step), signed out.
-- Helpers, office roles, signed agreements and attendance history are not touched.
do $$
declare v_ids uuid[] := array(select id from public.profiles where role = 'technician');
begin
  insert into public.login_pins (profile_id, pin_hash, set_by)
  select unnest(v_ids), extensions.crypt('1111', extensions.gen_salt('bf')), null
  on conflict (profile_id) do update
    set pin_hash = excluded.pin_hash, set_by = null, failed_attempts = 0, locked_until = null, updated_at = now();
  delete from public.registered_devices where profile_id = any(v_ids);
  delete from public.device_change_requests where profile_id = any(v_ids) and status = 'pending';
  delete from public.face_enrollments where person_id = any(v_ids);
  delete from auth.refresh_tokens where user_id::uuid = any(v_ids);
  delete from auth.sessions where user_id = any(v_ids);
end $$;
