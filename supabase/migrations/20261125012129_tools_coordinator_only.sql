-- Tools are the Coordinator's (client interview, Nov 2026: "Coordinator lang"; CONSULTATION_FIXES B10). HR no longer adds,
-- edits, lends or checks in tools; the CEO keeps full access. Everyone still reads the tool list, and people see their own borrowings.
drop policy "office manages tools (add)" on public.tools;
drop policy "office manages tools (edit)" on public.tools;
drop policy "office manages tools (remove)" on public.tools;
drop policy "office manages borrowings (add)" on public.tool_borrowings;
drop policy "office manages borrowings (edit)" on public.tool_borrowings;
drop policy "office manages borrowings (remove)" on public.tool_borrowings;
drop policy "own borrowings or office" on public.tool_borrowings;

create policy "coordinator manages tools (add)" on public.tools for insert to authenticated
  with check ((select public.my_role()) in ('ceo', 'coordinator'));
create policy "coordinator manages tools (edit)" on public.tools for update to authenticated
  using ((select public.my_role()) in ('ceo', 'coordinator')) with check ((select public.my_role()) in ('ceo', 'coordinator'));
create policy "coordinator manages tools (remove)" on public.tools for delete to authenticated
  using ((select public.my_role()) in ('ceo', 'coordinator'));
create policy "coordinator manages borrowings (add)" on public.tool_borrowings for insert to authenticated
  with check ((select public.my_role()) in ('ceo', 'coordinator'));
create policy "coordinator manages borrowings (edit)" on public.tool_borrowings for update to authenticated
  using ((select public.my_role()) in ('ceo', 'coordinator')) with check ((select public.my_role()) in ('ceo', 'coordinator'));
create policy "coordinator manages borrowings (remove)" on public.tool_borrowings for delete to authenticated
  using ((select public.my_role()) in ('ceo', 'coordinator'));
create policy "own borrowings or coordinator" on public.tool_borrowings for select to authenticated
  using (technician_id = (select auth.uid()) or (select public.my_role()) in ('ceo', 'coordinator'));
