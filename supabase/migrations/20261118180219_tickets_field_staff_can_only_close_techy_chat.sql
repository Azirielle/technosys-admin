-- Field staff may change a ticket in one way only: close their own Techy chat ("End" in the app) while HR hasn't taken
-- it over. Before this, the rule "update own ticket or office" let them change any column of their own tickets, e.g.
-- put handling_mode back to 'AI' after HR took over, or change a ticket's status or category. Office staff and the
-- server (no signed-in user) are not limited. The row rule (own tickets only) stays; this adds the column limit.
create or replace function public.tickets_field_staff_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_office_staff() then
    return new;
  end if;
  if old.title = 'Support Conversation' and old.handling_mode is distinct from 'ADMIN'
     and new.status = 'closed'
     and (to_jsonb(new) - 'status' - 'updated_at') = (to_jsonb(old) - 'status' - 'updated_at') then
    return new;
  end if;
  raise exception 'Only the office can change this ticket.' using errcode = '42501';
end $$;

create trigger tickets_field_staff_limits before update on public.tickets
for each row execute function public.tickets_field_staff_limits();
