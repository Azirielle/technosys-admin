-- One concern = one ticket (Andrew, 27 Nov): a technician may turn their OWN open Techy chat into the concern they
-- file from it (DTR, Others, tools). Only once (the title stops being Techy's), only these kinds, the status stays
-- open, and nothing else on the ticket may change (owner, handling, dates...). Everything else stays office-only.
-- Patched in place: tickets_field_staff_limits (from tickets_field_staff_can_only_close_techy_chat).
do $$
declare
  def text := pg_get_functiondef('public.tickets_field_staff_limits()'::regprocedure);
  old_raise constant text := $q$  raise exception 'Only the office can change this ticket.' using errcode = '42501';$q$;
  new_rule constant text := $q$  -- 27 Nov: their own open Techy chat may become the concern they file from it (once)
  if old.employee_id = auth.uid() and old.title = 'Support Conversation' and old.handling_mode is distinct from 'ADMIN'
     and old.status in ('open', 'in_progress') and new.status = 'open'
     and new.title is distinct from 'Support Conversation' and length(coalesce(new.title, '')) between 3 and 200
     and new.category in ('DTR Issue', 'Others', 'Equipment / Tools', 'Tool request')
     and new.priority in ('low', 'medium', 'high', 'urgent')
     and (to_jsonb(new) - 'title' - 'category' - 'description' - 'priority' - 'status' - 'updated_at')
       = (to_jsonb(old) - 'title' - 'category' - 'description' - 'priority' - 'status' - 'updated_at') then
    return new;
  end if;
$q$;
begin
  if position(old_raise in def) = 0 then raise exception 'tickets_field_staff_limits: raise line not found'; end if;
  if position('their own open Techy chat may become' in def) > 0 then raise exception 'already patched'; end if;
  execute replace(def, old_raise, new_rule || old_raise);
end $$;
