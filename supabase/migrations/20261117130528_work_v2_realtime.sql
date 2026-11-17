-- Work v2: send live changes of jobs, crews, work days and reviews to the admin's Today and Scheduling pages.
-- Row access rules (RLS) still decide who receives which rows.
alter publication supabase_realtime add table public.jobs, public.job_members, public.work_days, public.reviews;
