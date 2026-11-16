-- Work v2: the Coordinator's job saves record history (created, moved, crew changed, cancelled) in job_events.
-- Field staff still add events only through mark_job_progress.
create policy "coordinator adds job events" on public.job_events for insert to authenticated
  with check ((select public.my_role()) in ('coordinator', 'ceo') and by_id = (select auth.uid()));
