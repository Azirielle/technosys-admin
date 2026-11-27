-- Before the defense (Andrew, 28 Nov).
-- 1) Helpers don't have accounts (a typed name on the job). The 4 helper accounts are archived and can't sign in;
--    on jobs not finished yet they stay on the crew as casual helpers (named, no account). Pedro's waiting leave is
--    turned down with the reason. Their past records (DTR, finished jobs) stay as they are.
insert into public.casual_helpers (full_name, contact_number, notes, status)
select p.full_name, p.contact_number, 'Was a helper account until 28 Nov 2026', 'active'
from public.profiles p
where p.role = 'helper' and p.lifecycle_status <> 'archived'
  and not exists (select 1 from public.casual_helpers c where c.full_name = p.full_name);

update public.job_members m
set person_id = null, temp_worker_id = c.id, vehicle_id = null,
    role = case when m.role in ('crew', 'helper') then m.role else 'helper' end
from public.profiles p, public.casual_helpers c, public.jobs j
where m.person_id = p.id and p.role = 'helper' and p.lifecycle_status <> 'archived'
  and c.full_name = p.full_name and j.id = m.job_id
  and m.removed_at is null and j.status in ('planned', 'ongoing');

update public.leaves l
set status = 'rejected', rejection_reason = 'Helper accounts were closed: helpers are now listed by name on the job.', updated_at = now()
from public.profiles p
where l.technician_id = p.id and p.role = 'helper' and l.status = 'pending';

update auth.users u set banned_until = now() + interval '100 years'
from public.profiles p
where u.id = p.id and p.role = 'helper' and p.lifecycle_status <> 'archived';

update public.profiles set lifecycle_status = 'archived'
where role = 'helper' and lifecycle_status <> 'archived';

-- 2) Ticket photos and files are private: only the person who sent one and office staff can open them
--    (the admin shows them with a link that works for an hour; new messages save the path, not a public link).
update storage.buckets set public = false where id in ('ticket_attachments', 'chat-attachments');
create policy "owner or office views ticket files" on storage.objects for select to authenticated
  using (bucket_id in ('ticket_attachments', 'chat-attachments') and (owner = (select auth.uid()) or public.is_office_staff()));

-- 3) get_email_from_contact (old email sign-in) is used nowhere and answered anyone, signed in or not.
drop function if exists public.get_email_from_contact(text);
