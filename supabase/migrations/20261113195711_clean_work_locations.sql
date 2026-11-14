-- Rescue step 4: keep only real company sites. Test locations (homes, school) removed; Main Office becomes Pacita HQ.
delete from public.office_locations
where name in ('Dagat', 'Bahay ni Alms', 'Bahay kows', 'Bahay ni drew', 'Bahay ni drew2', 'PUP', 'PUP SPC');

update public.office_locations
set name = 'Pacita HQ', latitude = 14.3439, longitude = 121.0617, radius_meters = 150, updated_at = now()
where name = 'Main Office';
