-- Brief 10: on-site crews check in at the Pacita office (face check there); time starts on arrival at the site.
-- 1. Pacita office location coordinates and radius
update public.office_locations
set latitude = 14.337862, longitude = 121.060734, radius_meters = 75, updated_at = now()
where name = 'Pacita HQ';
