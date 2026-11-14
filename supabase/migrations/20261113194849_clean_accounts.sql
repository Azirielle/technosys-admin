-- Rescue step 2: one clean demo roster.
-- Removes team test logins, placeholders, duplicates and extra executive roles.
-- Keeps: CEO, HR, Coordinator, Accountant (unchanged logins) + 18 technicians + 3 helpers.

create temp table removed_users on commit drop as
select id from auth.users where email in (
  'glorijohngozo@gmail.com','andrewadarayan@gmail.com','nherie@gmail.com','juan.delacruz@gmail.com',
  'jemira@gmail.com','cristina@gmail.com','janreygozo@gmail.com','sasha@gmail.com','fnamelname@gmail.com',
  'lnamefname@gmail.com','gozojohnglori@gmail.com','example@gmail.com','christine@gmail.com','nherayferreras@gmail.com',
  'technosis@admin.com','superadmin@technosis.com','corazon.coo@technocycle.com','benjamin.manager@technocycle.com',
  'santiago.supervisor@technocycle.com','abby.coordinator@technocycle.com');

-- References that don't clean themselves up
delete from public.employee_warnings where employee_id in (select id from removed_users) or issued_by in (select id from removed_users);
update public.employee_warnings set service_dept_reviewer_id = null where service_dept_reviewer_id in (select id from removed_users);
update public.employee_warnings set last_edited_by = null where last_edited_by in (select id from removed_users);
delete from public.attendance_corrections where corrected_by in (select id from removed_users);
delete from public.push_notifications_queue where user_id in (select id from removed_users);
update public.app_versions set created_by = null where created_by in (select id from removed_users);
update public.announcements set last_edited_by = null where last_edited_by in (select id from removed_users);
update public.schedule_history set changed_by = null where changed_by in (select id from removed_users);
update public.tool_borrowings set received_by = null where received_by in (select id from removed_users);
delete from public.temporary_access where granted_by in (select id from removed_users);  -- expired grants from removed admins

-- Deleting the login removes the profile and everything that belongs to it (cascade)
delete from auth.users where id in (select id from removed_users);

-- Field staff: company emails, phone numbers for phone login, one demo password
-- (password123 is what the current mobile phone login sends; replace with a PIN in the mobile pass)
with staff as (
  select p.id, p.full_name, u.email,
         row_number() over (order by p.role desc, p.full_name) as n
  from public.profiles p join auth.users u on u.id = p.id
  where p.role in ('technician','helper')
), new_values as (
  select id,
         case when email = 'juan@gmail.com' then 'juan.delacruz@technocycle.ph'
              else regexp_replace(lower(translate(full_name, ' ', '.')), '[^a-z.]', '', 'g') || '@technocycle.ph' end as new_email,
         case when email = 'juan@gmail.com' then '+639123456789'
              else '+6391700000' || lpad(n::text, 2, '0') end as phone
  from staff
)
update auth.users u set email = v.new_email, encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')), updated_at = now()
from new_values v where u.id = v.id;

update auth.identities i set identity_data = i.identity_data || jsonb_build_object('email', u.email)
from auth.users u where u.id = i.user_id and i.provider = 'email';

with staff as (
  select p.id, u.email, row_number() over (order by p.role desc, p.full_name) as n
  from public.profiles p join auth.users u on u.id = p.id where p.role in ('technician','helper')
)
update public.profiles p set contact_number = case when s.email = 'juan.delacruz@technocycle.ph' then '+639123456789' else '+6391700000' || lpad(s.n::text, 2, '0') end
from staff s where p.id = s.id;

-- Office staff: field-only columns don't apply to them
update public.profiles set technician_level = null, employment_status = 'regular', is_driver = false
where role in ('ceo','hr','coordinator','accountant');
