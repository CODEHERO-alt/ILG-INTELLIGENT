-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Status enum or check constraint
do $$
begin
  if not exists (select 1 from pg_type where typname = 'instagram_status') then
    create type instagram_status as enum (
      'new',
      'queued',
      'contacted',
      'loom_sent',
      'interested',
      'closed',
      'dead'
    );
  end if;
end
$$;

-- updated_at trigger function
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- instagram_accounts table
create table if not exists public.instagram_accounts (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  full_name text,
  bio text,
  website_url text,
  followers_count integer,
  following_count integer,
  is_business boolean,
  niche_guess text,
  has_website boolean not null default false,
  last_post_at timestamptz,
  quality_score integer not null default 0,
  status instagram_status not null default 'new',
  last_status_change_at timestamptz not null default now(),
  reason_dead text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_tag text
);

create index if not exists idx_instagram_accounts_username
  on public.instagram_accounts (username);

create index if not exists idx_instagram_accounts_status
  on public.instagram_accounts (status);

create index if not exists idx_instagram_accounts_quality_score
  on public.instagram_accounts (quality_score);

create trigger set_updated_at_instagram_accounts
before update on public.instagram_accounts
for each row execute procedure set_updated_at();

-- instagram_account_activity table
create table if not exists public.instagram_account_activity (
  id uuid primary key default uuid_generate_v4(),
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_instagram_account_activity_account_id
  on public.instagram_account_activity (instagram_account_id);

-- admin_users table (maps to auth.users)
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- simple logs table for jobs
create table if not exists public.job_logs (
  id uuid primary key default uuid_generate_v4(),
  job_name text not null,
  level text not null default 'info',
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);
