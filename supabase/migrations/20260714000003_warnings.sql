create table if not exists employee_warnings (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references auth.users(id) not null,
  issued_by uuid references auth.users(id) not null,
  service_dept_reviewer_id uuid references auth.users(id),
  warning_level text not null,
  incident_date date,
  policies_violated text,
  subject text not null,
  details text not null,
  attachments text[],
  status text default 'pending_service_review' not null,
  rejection_reason text,
  last_edited_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table employee_warnings enable row level security;

create policy "Enable read access for authenticated users" on employee_warnings for select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on employee_warnings for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on employee_warnings for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on employee_warnings for delete using (auth.role() = 'authenticated');
