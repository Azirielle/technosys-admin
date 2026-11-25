-- Scope of work replaces "Project" in the job form (client interview, Nov 2026: "palitan n'yo na lang ng scope, huwag n'yo
-- nang lagyan ng project"; CONSULTATION_FIXES B5). Only these five choices. Old jobs keep project_name and have no scope.
alter table public.jobs add column scope text
  check (scope in ('repair', 'cleaning', 'installation', 'troubleshooting', 'inspection'));
