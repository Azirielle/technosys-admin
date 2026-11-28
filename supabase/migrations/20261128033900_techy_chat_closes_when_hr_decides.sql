-- Techy chat closes when HR decides (28 Nov, Andrew). A DTR or "Others" concern turns the Techy chat itself into the
-- ticket, so it closed when HR resolved it. A leave or a tool request is filed on its own form, so the Techy chat stayed
-- open with the old credits until the technician pressed End. Now: when HR decides a leave, or a tool request is
-- finished, that person's open Techy chat closes with a note, and their next question starts fresh (new credits).
-- Tested on live data in a rolled-back block (as HR): leave approved -> chat closed with note; tool request resolved -> same.
create or replace function public.close_techy_chat(p_person uuid, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $$
declare v_id uuid;
begin
  for v_id in
    select id from public.tickets
    where employee_id = p_person and title = 'Support Conversation'
      and status in ('open', 'in_progress') and coalesce(handling_mode, '') <> 'ADMIN'
  loop
    insert into public.ticket_comments (ticket_id, author_id, content, sender_role)
      values (v_id, coalesce(auth.uid(), p_person), p_note, 'system');
    update public.tickets set status = 'closed', updated_at = now() where id = v_id;
  end loop;
end $$;
revoke all on function public.close_techy_chat(uuid, text) from public, anon, authenticated;

create or replace function public.leave_decided_closes_techy_chat()
 returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  perform public.close_techy_chat(new.technician_id,
    format('Your leave (%s to %s) was %s by HR. Ask me again to see your updated leave credits.',
      to_char(new.start_date, 'Mon DD'), to_char(new.end_date, 'Mon DD'),
      case new.status when 'approved' then 'approved' else 'declined' end));
  return new;
end $$;
drop trigger if exists leave_decided_closes_techy_chat on public.leaves;
create trigger leave_decided_closes_techy_chat after update of status on public.leaves
  for each row when (old.status = 'pending' and new.status in ('approved', 'rejected'))
  execute function public.leave_decided_closes_techy_chat();

create or replace function public.tool_request_done_closes_techy_chat()
 returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  perform public.close_techy_chat(new.employee_id,
    format('Your tool request (%s) was %s. Ask me again to see your tools.', new.title,
      case new.status when 'resolved' then 'approved' else 'closed' end));
  return new;
end $$;
drop trigger if exists tool_request_done_closes_techy_chat on public.tickets;
create trigger tool_request_done_closes_techy_chat after update of status on public.tickets
  for each row when (new.category = 'Tool request' and old.status in ('open', 'in_progress') and new.status in ('resolved', 'closed'))
  execute function public.tool_request_done_closes_techy_chat();
