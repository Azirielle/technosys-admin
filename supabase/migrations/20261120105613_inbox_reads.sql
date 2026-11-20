-- Which Inbox items each person has opened (20 Nov). It used to live only on the phone, so a reinstall or a new
-- phone showed every message as new again. Item ids are the app's own (e.g. "ann_<id>", a ticket comment id).
create table public.inbox_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null check (length(item_id) between 1 and 120),
  read_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.inbox_reads enable row level security;
create policy "own inbox reads (see)" on public.inbox_reads for select to authenticated using (user_id = (select auth.uid()));
create policy "own inbox reads (mark)" on public.inbox_reads for insert to authenticated with check (user_id = (select auth.uid()));
