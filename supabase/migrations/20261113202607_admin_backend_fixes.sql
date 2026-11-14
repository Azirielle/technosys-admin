-- Rescue step 6: columns the admin dashboard expects, and leftovers nothing should use.

-- Accountant role is gone; its module is now HR's "DTR & Attendance" (hr_dtr).
delete from public.role_access where role_key not in ('hr', 'coordinator');
update public.role_access set granted_modules = array_replace(granted_modules, 'accountant_audit', 'hr_dtr');

-- Keeps updated_at current on every edit.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Inventory edits write updated_at (the column was missing, so every tool update failed).
alter table public.tools add column if not exists updated_at timestamptz not null default now();
create trigger set_tools_updated_at before update on public.tools
  for each row execute function public.set_updated_at();

-- Payroll is out of scope; phone tokens live in push_tokens (one row per phone), not on the profile.
alter table public.profiles drop column base_salary, drop column push_token;

-- Announcements: draft / scheduled / published, who it is for, and whether to send a push.
alter table public.announcements
  add column status text not null default 'published' check (status in ('draft', 'scheduled', 'published')),
  add column audience text not null default 'all' check (audience in ('all', 'field_staff', 'office_staff')),
  add column scheduled_for timestamptz,
  add column send_push boolean not null default true;

drop policy "everyone reads announcements" on public.announcements;
create policy "staff read published announcements" on public.announcements for select to authenticated
  using (
    public.is_office_staff()
    or (status = 'published' and audience in ('all', 'field_staff'))
    or (status = 'scheduled' and scheduled_for <= now() and audience in ('all', 'field_staff'))
  );

-- Pushes are now sent by the admin server (lib/push.ts) only when an announcement is published.
-- The old webhook fired on every insert, including drafts, with no title.
drop trigger if exists "Push New Announcements" on public.announcements;
