-- A technician can also be the job's driver (20 Nov). The driver is now whoever has the vehicle on their row, so a
-- lead or crew member who drives keeps one row (their real role + the vehicle). Someone who only drives keeps role 'driver'.
alter table public.job_members drop constraint job_members_vehicle_for_drivers;
alter table public.job_members add constraint job_members_vehicle_for_people check (vehicle_id is null or person_id is not null);

-- time_out(): "is this person the driver?" = has the vehicle (it was role = 'driver'). Only that one line changes.
do $$
declare def text := pg_get_functiondef('public.time_out(double precision, double precision, text, timestamptz, text)'::regprocedure);
begin
  if position('m.role = ''driver''' in def) = 0 then raise exception 'time_out changed: driver check not found'; end if;
  execute replace(def, 'm.role = ''driver''', 'm.vehicle_id is not null');
end $$;
