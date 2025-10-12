-- Active: 1752834822892@@127.0.0.1@3306@mysql
-- Membuat tabel kredensial admin untuk menyimpan hash password
create table if not exists public.admin_credentials (
    email text primary key,
    password_hash text not null,
    updated_at timestamptz not null default now()
);

-- Membuat tabel token reset password admin
create table if not exists public.admin_password_reset_tokens (
    token text primary key,
    email text not null references public.admin_credentials(email) on delete cascade,
    expires_at timestamptz not null,
    used boolean not null default false,
    created_at timestamptz not null default now(),
    used_at timestamptz
);

-- Index untuk mempercepat query berdasarkan email
create index if not exists admin_password_reset_tokens_email_idx on public.admin_password_reset_tokens(email);

-- Pastikan hanya ada satu token aktif per email
create unique index if not exists admin_password_reset_tokens_email_active_idx
    on public.admin_password_reset_tokens(email)
    where used = false;
