-- Rescue step 9: same access rules, faster (Supabase performance advisor).

-- 1. Look up the signed-in user once per query, not once per row: auth.uid() -> (select auth.uid()).
do $$
declare
  p record;
  q text;
  c text;
begin
  for p in select * from pg_policies where schemaname = 'public'
           and (qual like '%auth.uid()%' or with_check like '%auth.uid()%') loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    c := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    if p.cmd = 'INSERT' then
      execute format('alter policy %I on public.%I with check (%s)', p.policyname, p.tablename, c);
    elsif c is null then
      execute format('alter policy %I on public.%I using (%s)', p.policyname, p.tablename, q);
    elsif q is null then
      execute format('alter policy %I on public.%I with check (%s)', p.policyname, p.tablename, c);
    else
      execute format('alter policy %I on public.%I using (%s) with check (%s)', p.policyname, p.tablename, q, c);
    end if;
  end loop;
end $$;

-- 2. "Manage" rules that also covered reading overlapped the read rule; split them into add / edit / remove.
do $$
declare
  p record;
begin
  for p in select a.* from pg_policies a
           where a.schemaname = 'public' and a.cmd = 'ALL'
             and exists (select 1 from pg_policies s where s.schemaname = 'public' and s.tablename = a.tablename
                           and s.cmd = 'SELECT' and s.policyname <> a.policyname) loop
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
                   p.policyname || ' (add)', p.tablename, coalesce(p.with_check, p.qual));
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
                   p.policyname || ' (edit)', p.tablename, p.qual, coalesce(p.with_check, p.qual));
    execute format('create policy %I on public.%I for delete to authenticated using (%s)',
                   p.policyname || ' (remove)', p.tablename, p.qual);
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 3. Indexes for the remaining foreign keys.
create index if not exists idx_attendance_corrections_corrected_by on public.attendance_corrections (corrected_by);
create index if not exists idx_policies_created_by on public.policies (created_by);
create index if not exists idx_policies_reviewed_by on public.policies (reviewed_by);
create index if not exists idx_role_access_updated_by on public.role_access (updated_by);
create index if not exists idx_schedule_history_changed_by on public.schedule_history (changed_by);
create index if not exists idx_tool_borrowings_received_by on public.tool_borrowings (received_by);
