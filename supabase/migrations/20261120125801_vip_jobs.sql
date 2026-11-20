-- VIP squeeze-in (20 Nov; PROJECT_PLAN problem P2). A VIP job may take people who are already booked at the same
-- time: saving it takes them off the other job (logged in that job's history, pushed to them). The job that lost
-- someone carries vip_note until the Coordinator saves it again, so Scheduling's "Needs you" says to call the client.
alter table public.jobs add column is_vip boolean not null default false;
alter table public.jobs add column vip_note text check (vip_note is null or length(vip_note) <= 300);
