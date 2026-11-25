-- Urgent job not seen → call (prof, 20 Nov: "kapag hindi sila aware, tawagan na nila"; CONSULTATION_FIXES B13).
-- The phone records when a crew member's app first showed them the job; the Coordinator sees "Seen 8:12 AM" or
-- "Not seen yet: call" in the job details.
alter table public.job_members add column seen_at timestamptz;

create or replace function public.mark_jobs_seen(p_job_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.job_members set seen_at = now()
  where person_id = auth.uid() and job_id = any(p_job_ids) and seen_at is null and removed_at is null;
$$;
revoke all on function public.mark_jobs_seen(uuid[]) from public, anon;
grant execute on function public.mark_jobs_seen(uuid[]) to authenticated;
