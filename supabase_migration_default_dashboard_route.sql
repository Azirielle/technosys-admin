-- Migration: Add default_dashboard_route to roles/profiles
-- This ensures that when an admin logs in, the auth resolver knows exactly which Route Group to push them to.

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS default_dashboard_route text;

-- Example seed updates:
-- UPDATE roles SET default_dashboard_route = '/(ceo)' WHERE name = 'CEO';
-- UPDATE roles SET default_dashboard_route = '/(hr)' WHERE name = 'HR';
-- UPDATE roles SET default_dashboard_route = '/(coordinator)' WHERE name = 'Coordinator';
-- UPDATE roles SET default_dashboard_route = '/(accountant)' WHERE name = 'Accountant';
