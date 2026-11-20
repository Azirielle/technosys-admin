-- VIP squeeze-in (20 Nov): copy_legacy_to_work_v2 carries the old schedules' is_vip_hook into jobs.is_vip (the demo
-- data's VIP job), and the jobs already copied get it too. Only those two lines of the function change.
do $$
declare def text := pg_get_functiondef('public.copy_legacy_to_work_v2(boolean)'::regprocedure);
begin
  if position('created_at, legacy_schedule_id)' in def) = 0 or position(E'      created_at, id\n    from src' in def) = 0 then
    raise exception 'copy_legacy_to_work_v2 changed: anchors not found';
  end if;
  def := replace(def, 'created_at, legacy_schedule_id)', 'created_at, legacy_schedule_id, is_vip)');
  def := replace(def, E'      created_at, id\n    from src', E'      created_at, id, coalesce(is_vip_hook, false)\n    from src');
  execute def;
end $$;
update public.jobs j set is_vip = true from public.schedules s where j.legacy_schedule_id = s.id and s.is_vip_hook;
