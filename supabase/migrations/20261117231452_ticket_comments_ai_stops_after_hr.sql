-- Ticket messages from field staff: only as themselves ('technician'), or the AI's answer ('ai') while the ticket is
-- still the AI's. Once HR takes over (tickets.handling_mode = 'ADMIN') no more AI replies can be saved, and field staff
-- can never post as HR ('admin') or the system. The phone saves the AI's answers itself, so this is the rule that holds.
-- Office staff keep writing as before.
drop policy "write on own tickets or office" on public.ticket_comments;
create policy "write on own tickets or office" on public.ticket_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (
    public.is_office_staff()
    or (
      not coalesce(is_internal, false)
      and exists (
        select 1 from public.tickets t
        where t.id = ticket_comments.ticket_id and t.employee_id = (select auth.uid())
          and (coalesce(ticket_comments.sender_role, 'technician') = 'technician'
               or (ticket_comments.sender_role = 'ai' and t.handling_mode is distinct from 'ADMIN'))
      )
    )
  )
);
