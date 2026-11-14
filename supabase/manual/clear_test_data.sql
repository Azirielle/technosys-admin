-- Clear leftover test data before seeding the defense demo data.
-- Run once in Supabase > SQL Editor. Everything removed here is still in the backup_20261113 schema.
delete from public.activity_logs;                     -- 287 entries about test accounts that no longer exist
delete from public.announcements;                     -- "TESTING", "TEST (Iniba kows)" and similar
delete from public.transactional_sms_logs;            -- 1 test SMS
delete from public.app_versions where not is_active;  -- keep only the current APK (0.7.0)
-- Five copies of the same unfinished fleet-fuel draft policy (vehicles are outside the system's scope)
delete from public.policies
where status = 'draft'
  and (id like 'fleet_vehicle_fuel_liquidation_telemetry_%' or id like 'service_vehicle_fleet_fuel_liquidation_%');
