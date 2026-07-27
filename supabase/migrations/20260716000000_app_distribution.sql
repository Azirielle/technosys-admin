-- Create app_versions table
create table if not exists public.app_versions (
    id uuid default gen_random_uuid() primary key,
    version_name text not null,
    release_notes text,
    apk_file_url text not null,
    is_active boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.app_versions enable row level security;

-- Everyone authenticated can view app versions (Technicians need to see what to download)
create policy "Anyone authenticated can view app versions" on public.app_versions
    for select using (auth.role() = 'authenticated');

-- Only Admins can manage app versions
create policy "Admins can manage app versions" on public.app_versions
    for all using (
      exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and (profiles.role::text = 'admin' or profiles.role::text = 'super_admin')
      )
    );


-- Create app-releases storage bucket (Private)
insert into storage.buckets (id, name, public) 
values ('app-releases', 'app-releases', false)
on conflict (id) do nothing;

-- Enable RLS on storage.objects
-- Note: Supabase enables RLS on storage.objects by default, but we need to add policies for our bucket

-- Anyone authenticated can view objects in app-releases
create policy "Anyone authenticated can view app-releases" on storage.objects
    for select using (bucket_id = 'app-releases' and auth.role() = 'authenticated');

-- Only admins can insert into app-releases
create policy "Admins can upload to app-releases" on storage.objects
    for insert with check (
      bucket_id = 'app-releases' and
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and (profiles.role::text = 'admin' or profiles.role::text = 'super_admin')
      )
    );

-- Only admins can update/delete in app-releases
create policy "Admins can update app-releases" on storage.objects
    for update using (
      bucket_id = 'app-releases' and
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and (profiles.role::text = 'admin' or profiles.role::text = 'super_admin')
      )
    );

create policy "Admins can delete app-releases" on storage.objects
    for delete using (
      bucket_id = 'app-releases' and
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and (profiles.role::text = 'admin' or profiles.role::text = 'super_admin')
      )
    );
