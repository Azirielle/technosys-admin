-- lend_tool_units also returns the borrower's name, so the admin's activity history says who got the tools.
do $$
declare
  def text := pg_get_functiondef('public.lend_tool_units(uuid,uuid[],text,text)'::regprocedure);
  anchor text := E'return jsonb_build_object(''status'', ''lent'', ''count''';
begin
  if position(anchor in def) = 0 then raise exception 'lend_tool_units changed: anchor not found'; end if;
  execute replace(def, anchor, E'return jsonb_build_object(''name'', (select full_name from public.profiles where id = p_technician_id), ''status'', ''lent'', ''count''');
end $$;
