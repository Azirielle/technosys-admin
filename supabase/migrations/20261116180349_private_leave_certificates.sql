-- Leave certificates are private (17 Nov 2026, Andrew's decision).
--   The "leaves" bucket was public, so anyone with a link could open a medical certificate without signing in.
--   Now: the bucket is private, leaves.attachment_url holds the file's path in the bucket (not a link), and only
--   the person who uploaded it, HR and the CEO can open it (the admin makes a short-lived signed link).

update storage.buckets set public = false where id = 'leaves';

create policy "owner or hr views leave certificates" on storage.objects
  for select to authenticated
  using (bucket_id = 'leaves' and (owner = (select auth.uid()) or (select public.my_role()) in ('hr', 'ceo')));

-- Old public links become paths (there were none on 17 Nov; kept for safety).
update public.leaves
set attachment_url = regexp_replace(attachment_url, '^.*/object/public/leaves/', '')
where attachment_url like 'http%/object/public/leaves/%';

comment on column public.leaves.attachment_url is 'Path of the medical certificate in the private "leaves" storage bucket (open with a signed link).';
