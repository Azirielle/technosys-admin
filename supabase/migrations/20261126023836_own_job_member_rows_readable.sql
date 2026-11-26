-- Round 5 P3: being taken off a job didn't reach the phone live. Realtime only sends a change the phone may read, and
-- crew rows were readable only while you're on the job, so the "removed" update itself was hidden. A person may now
-- always read their OWN crew rows (removed ones too); nobody else's access changes.
create policy "own crew rows" on public.job_members for select to authenticated
  using (person_id = (select auth.uid()));
