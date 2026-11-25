-- Priority level on jobs (prof, 20 Nov: "low, medium, high ... para alam nila kung ano yung uunahin"; CONSULTATION_FIXES B2).
-- A VIP squeeze-in shows as Urgent on top of this (jobs.is_vip). Tickets already have tickets.priority.
alter table public.jobs add column priority text not null default 'medium' check (priority in ('low', 'medium', 'high'));
