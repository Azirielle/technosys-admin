-- Work v2: the Coordinator's "manage" rules covered reading too, so every read checked two rules
-- (Supabase advisor: multiple permissive policies). Reading keeps one rule; writing gets its own three.
drop policy "coordinator manages vehicles" on public.vehicles;
drop policy "coordinator manages jobs" on public.jobs;
drop policy "coordinator manages members" on public.job_members;

create policy "coordinator adds vehicles" on public.vehicles for insert to authenticated
  with check ((select public.my_role()) in ('coordinator', 'ceo'));
create policy "coordinator edits vehicles" on public.vehicles for update to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo')) with check ((select public.my_role()) in ('coordinator', 'ceo'));
create policy "coordinator deletes vehicles" on public.vehicles for delete to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo'));

create policy "coordinator adds jobs" on public.jobs for insert to authenticated
  with check ((select public.my_role()) in ('coordinator', 'ceo'));
create policy "coordinator edits jobs" on public.jobs for update to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo')) with check ((select public.my_role()) in ('coordinator', 'ceo'));
create policy "coordinator deletes jobs" on public.jobs for delete to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo'));

create policy "coordinator adds members" on public.job_members for insert to authenticated
  with check ((select public.my_role()) in ('coordinator', 'ceo'));
create policy "coordinator edits members" on public.job_members for update to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo')) with check ((select public.my_role()) in ('coordinator', 'ceo'));
create policy "coordinator deletes members" on public.job_members for delete to authenticated
  using ((select public.my_role()) in ('coordinator', 'ceo'));
