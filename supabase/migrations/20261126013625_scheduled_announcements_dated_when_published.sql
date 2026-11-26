-- A scheduled announcement is dated when it goes out (created_at = scheduled_for), because the phone's Updates list
-- and the Home bell's unread count sort by created_at: dated when it was written, it was buried and could miss the bell.
do $$
declare
  def text := pg_get_functiondef('public.publish_due_announcements()'::regprocedure);
  anchor text := 'set status = ''published'', updated_at = now()';
begin
  if position(anchor in def) = 0 then raise exception 'publish_due_announcements changed: anchor not found'; end if;
  execute replace(def, anchor, 'set status = ''published'', created_at = scheduled_for, updated_at = now()');
end $$;
