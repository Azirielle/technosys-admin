-- Concern photos (Andrew, 27 Nov): when a technician turns their own Techy chat into a concern, the optional photo
-- (tickets.attachment_url / attachment_type) may be set in the same change. Patched in place: tickets_field_staff_limits
-- (from 20261127082857_chat_becomes_concern). The photo must be in the ticket_attachments bucket.
do $$
declare
  def text := pg_get_functiondef('public.tickets_field_staff_limits()'::regprocedure);
  old_cmp constant text := $q$     and (to_jsonb(new) - 'title' - 'category' - 'description' - 'priority' - 'status' - 'updated_at')
       = (to_jsonb(old) - 'title' - 'category' - 'description' - 'priority' - 'status' - 'updated_at') then$q$;
  new_cmp constant text := $q$     and (new.attachment_url is not distinct from old.attachment_url or new.attachment_url like '%/storage/v1/object/public/ticket_attachments/%')
     and (to_jsonb(new) - 'title' - 'category' - 'description' - 'priority' - 'status' - 'updated_at' - 'attachment_url' - 'attachment_type')
       = (to_jsonb(old) - 'title' - 'category' - 'description' - 'priority' - 'status' - 'updated_at' - 'attachment_url' - 'attachment_type') then$q$;
begin
  if position(old_cmp in def) = 0 then raise exception 'tickets_field_staff_limits: compare lines not found'; end if;
  execute replace(def, old_cmp, new_cmp);
end $$;
