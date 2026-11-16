-- The mobile Jobs tab shows what changed on a job ("Moved from Tue 9:00", "Added today", "Cancelled: client
-- postponed"). The history rows only hold times, status, crew names and the office's reason, so the people on
-- a job may read that job's history. Office staff keep their own policy.
create policy "crew reads own job history" on public.schedule_history
  for select to authenticated
  using ((select public.is_on_schedule(schedule_id)));
