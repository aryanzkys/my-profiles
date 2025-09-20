-- Announcements: table, RLS, indexes, trigger
-- Requires pgcrypto extension for gen_random_uuid() if not present

-- Enable extensions if needed (safe if already enabled)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  target text not null default 'both' check (target in ('main','ai','both')),
  active boolean not null default true,
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info','success','warning','error')),
  cta_text text,
  cta_url text,
  version text,
  dismissible boolean not null default true,
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Updated_at auto-update trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists set_updated_at_announcements on public.announcements;
create trigger set_updated_at_announcements
before update on public.announcements
for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_announcements_active_target_updated
  on public.announcements (active, target, updated_at desc);

-- RLS
alter table public.announcements enable row level security;

-- Allow anon read of active rows only
create policy if not exists announcements_read_active
on public.announcements for select
using (active = true);

-- Admin upsert/delete policy example: use service role or tag admins
-- If using service_role keys from serverless, RLS is bypassed by Supabase; otherwise, restrict by email claim if present
-- Example policy for authenticated admins with email claim (adjust to your auth schema)
-- create policy announcements_write_admins on public.announcements
--   for all to authenticated
--   using (auth.jwt() ->> 'email' = 'owner@domain.com')
--   with check (auth.jwt() ->> 'email' = 'owner@domain.com');

-- Note: adjust policies to your auth model if not using service_role.
