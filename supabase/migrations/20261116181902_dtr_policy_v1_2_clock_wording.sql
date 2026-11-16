-- Attendance/DTR policy v1.2.0, one line corrected the same day (17 Nov 2026, nobody had signed it yet):
-- the app doesn't block a time-in for a wrong phone clock; every punch uses the server's time, and a
-- time-out from a phone whose clock is more than 5 minutes off is marked for HR to check.
do $$
declare
  old_line constant text := '2. **Wrong phone clock:** The app compares the phone''s clock with the GPS time. If they differ by more than five (5) minutes, time-in is blocked until the phone uses automatic time, and a time-out is marked for HR to check.';
  new_line constant text := '2. **Wrong phone clock:** Every time-in and time-out uses the server''s time, never the phone''s. If the phone''s clock is more than five (5) minutes off when you time out, the time-out is marked for HR to check.';
  body text;
begin
  if exists (select 1 from public.policy_acknowledgments where policy_id = 'attendance_dtr_rev_v1_2') then
    raise exception 'Already signed: publish a new version instead';
  end if;
  select content_markdown into body from public.policies where id = 'attendance_dtr_rev_v1_2';
  if body is null or position(old_line in body) = 0 then
    if position(new_line in body) > 0 then return; end if;   -- already done
    raise exception 'Line not found';
  end if;
  body := replace(body, old_line, new_line);
  update public.policies
  set content_markdown = body, content_hash = encode(sha256(convert_to(body, 'UTF8')), 'hex'), updated_at = now()
  where id = 'attendance_dtr_rev_v1_2';
end $$;
