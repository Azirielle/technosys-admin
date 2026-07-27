create table if not exists announcement_contacts (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  role text,
  phone_number text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) not null,
  department_tag text not null,
  message text not null,
  recipient_count integer default 0,
  status text default 'mock_sent' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for announcement_contacts
alter table announcement_contacts enable row level security;
create policy "Enable read access for authenticated users" on announcement_contacts for select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on announcement_contacts for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on announcement_contacts for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on announcement_contacts for delete using (auth.role() = 'authenticated');

-- RLS for announcements
alter table announcements enable row level security;
create policy "Enable read access for authenticated users" on announcements for select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on announcements for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on announcements for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on announcements for delete using (auth.role() = 'authenticated');
