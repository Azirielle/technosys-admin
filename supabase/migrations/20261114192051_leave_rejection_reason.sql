-- Lets HR record why a leave request was declined, so the employee can see it.
alter table public.leaves add column if not exists rejection_reason text;
comment on column public.leaves.rejection_reason is 'Why HR declined this leave (shown to the employee). Empty unless status = rejected.';
