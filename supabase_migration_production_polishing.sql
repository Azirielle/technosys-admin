-- ==========================================
-- TECHNOSYS PRODUCTION POLISHING MIGRATION
-- Run this script in your hosted Supabase SQL Editor
-- ==========================================

-- 1. Enable Realtime Replication for critical synchronized tables
-- (Allows instant chat, realtime seen receipts, biometric scanning, and live OT updates)
alter publication supabase_realtime add table ticket_comments;
alter publication supabase_realtime add table leaves;
alter publication supabase_realtime add table physical_biometric_scans;
alter publication supabase_realtime add table overtime_requests;

-- 2. Create Storage Buckets and set public access properties
insert into storage.buckets (id, name, public) 
values 
  ('avatars', 'avatars', true),
  ('leaves', 'leaves', true),
  ('chat-attachments', 'chat-attachments', true),
  ('payroll-disputes', 'payroll-disputes', true)
on conflict (id) do update set public = true;

-- 3. Define Storage RLS Policies (Allows reading/writing files safely in production)

-- Avatars Bucket Policies
create policy "Allow public read access to avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Allow users to upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.role() = 'authenticated'
  );

-- Chat Attachments Bucket Policies
create policy "Allow public read access to chat attachments"
  on storage.objects for select using (bucket_id = 'chat-attachments');

create policy "Allow users to upload chat attachments"
  on storage.objects for insert with check (
    bucket_id = 'chat-attachments' and auth.role() = 'authenticated'
  );

-- Leaves Bucket Policies
create policy "Allow public read access to leave documents"
  on storage.objects for select using (bucket_id = 'leaves');

create policy "Allow users to upload leave documents"
  on storage.objects for insert with check (
    bucket_id = 'leaves' and auth.role() = 'authenticated'
  );

-- Payroll Disputes Bucket Policies
create policy "Allow public read access to disputes"
  on storage.objects for select using (bucket_id = 'payroll-disputes');

create policy "Allow users to upload dispute attachments"
  on storage.objects for insert with check (
    bucket_id = 'payroll-disputes' and auth.role() = 'authenticated'
  );
