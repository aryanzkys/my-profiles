-- Enable required extension for gen_random_uuid if not already
create extension if not exists pgcrypto;

-- Ensure RLS is enabled on sign_requests and add permissive policies for current flow
alter table public.sign_requests enable row level security;

-- Allow anyone (anon, authenticated) to insert sign requests
drop policy if exists sign_requests_insert_any on public.sign_requests;
create policy sign_requests_insert_any
on public.sign_requests for insert
to anon, authenticated
with check (true);

-- Allow anyone to select sign requests (app will still filter by email in client)
drop policy if exists sign_requests_select_all on public.sign_requests;
create policy sign_requests_select_all
on public.sign_requests for select
to anon, authenticated
using (true);

-- Allow anyone to update (needed by current admin page which uses anon client). Replace with server-side service-role in production.
drop policy if exists sign_requests_update_all on public.sign_requests;
create policy sign_requests_update_all
on public.sign_requests for update
to anon, authenticated
using (true)
with check (true);

-- Storage policies for 'documents' bucket (needed for uploads and reads)
-- NOTE: For getPublicUrl to work, set the bucket to public in the dashboard, or switch to createSignedUrl in code.

-- Allow select on objects in 'documents'
drop policy if exists storage_documents_read on storage.objects;
create policy storage_documents_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'documents');

-- Allow insert (upload) into 'documents'
drop policy if exists storage_documents_insert on storage.objects;
create policy storage_documents_insert
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'documents');

-- Allow update (optional)
drop policy if exists storage_documents_update on storage.objects;
create policy storage_documents_update
on storage.objects for update
to anon, authenticated
using (bucket_id = 'documents')
with check (bucket_id = 'documents');
