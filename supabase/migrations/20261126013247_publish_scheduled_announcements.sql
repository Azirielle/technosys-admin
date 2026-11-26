-- Scheduled announcements publish by themselves (Round 4 C7b; was a known issue: nothing ever published them).
-- Every minute: announcements due in the last hour become published, and those with "send push" go to the phones of
-- their audience (same roles as rolesFor() in Admin-side/src/app/actions/announcements.ts), straight to Expo like the
-- attendance reminders. Ones more than an hour overdue (from before this existed) are left for the Coordinator.
-- shortcut: urgent ones get no SMS from here (SMS isn't live yet); Expo takes up to 100 messages per request, fine for ~20 phones.
create or replace function public.publish_due_announcements()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  a record;
  v_msgs jsonb;
  v_n integer := 0;
begin
  for a in
    update public.announcements set status = 'published', updated_at = now()
    where status = 'scheduled' and scheduled_for <= now() and scheduled_for > now() - interval '1 hour'
    returning title, content, audience, send_push
  loop
    v_n := v_n + 1;
    continue when not a.send_push;
    select coalesce(jsonb_agg(jsonb_build_object('to', t.token, 'title', a.title, 'body', left(a.content, 150),
      'sound', 'default', 'data', jsonb_build_object('type', 'announcement'))), '[]'::jsonb)
    into v_msgs
    from public.push_tokens t
    join public.profiles p on p.id = t.user_id
    where p.lifecycle_status = 'active' and t.token like 'ExponentPushToken[%'
      and p.role::text = any (case a.audience
        when 'field_staff' then array['technician', 'helper']
        when 'office_staff' then array['ceo', 'hr', 'coordinator']
        else array['technician', 'helper', 'ceo', 'hr', 'coordinator'] end);
    if jsonb_array_length(v_msgs) > 0 then
      perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := v_msgs,
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
    end if;
  end loop;
  return v_n;
end $$;
revoke execute on function public.publish_due_announcements() from public, anon, authenticated;

select cron.schedule('publish-announcements', '* * * * *', 'select public.publish_due_announcements()');
