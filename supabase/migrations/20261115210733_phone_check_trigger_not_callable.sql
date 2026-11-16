-- check_registered_phone is only a trigger on attendance_logs; it must not be callable through the API.
revoke execute on function public.check_registered_phone() from public, anon, authenticated;
