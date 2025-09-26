-- Create table sign_requests
create table if not exists public.sign_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  file_url text,
  status text not null default 'Dalam Review',
  signed_file_url text,
  created_at timestamptz not null default now()
);

-- Optional: basic index to sort/filter by created_at and status
create index if not exists idx_sign_requests_created_at on public.sign_requests (created_at desc);
create index if not exists idx_sign_requests_status on public.sign_requests (status);

-- Note: Configure RLS as needed. Example policies (adjust for your security model):
-- alter table public.sign_requests enable row level security;
-- create policy "insert_sign_requests" on public.sign_requests for insert to anon, authenticated using (true);
-- create policy "select_own_email" on public.sign_requests for select to anon, authenticated using (email = current_setting('request.jwt.claims', true)::jsonb->>'email');
-- create policy "admin_update" on public.sign_requests for update to authenticated using (exists (select 1));

-- Storage: create bucket via dashboard named as in NEXT_PUBLIC_SUPABASE_BUCKET (default 'documents'),
-- and set public or signed URLs as desired. Create folder 'signed_documents' for signed files.
