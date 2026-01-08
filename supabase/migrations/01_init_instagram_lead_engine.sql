-- 1) Status enum (includes loom_sent)
do $$ begin
  create type instagram_status as enum (
    'new',
    'queued',
    'contacted',
    'loom_sent',
    'interested',
    'closed',
    'dead'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Admin table (real admin gate for RLS)
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 3) Main leads table
create table if not exists instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  followers integer default 0,
  bio text,
  website text,
  inferred_niche text,
  status instagram_status default 'new',
  quality_score integer default 0,

  website_title text,
  website_platform text,
  has_booking boolean default false,
  has_checkout boolean default false,
  offer_keywords text[],

  enriched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists instagram_accounts_status_idx on instagram_accounts(status);
create index if not exists instagram_accounts_score_idx on instagram_accounts(quality_score);
create index if not exists instagram_accounts_created_idx on instagram_accounts(created_at);

-- 4) updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger set_updated_at_trigger
  before update on instagram_accounts
  for each row execute function set_updated_at();
exception
  when duplicate_object then null;
end $$;

-- 5) RLS: admin-only access using admin_users table
alter table instagram_accounts enable row level security;
alter table admin_users enable row level security;

-- Helper condition: is admin?
-- (No function needed; use EXISTS inline.)

drop policy if exists "admin_read" on instagram_accounts;
drop policy if exists "admin_write" on instagram_accounts;

create policy "admin_read"
on instagram_accounts
for select
using (
  exists (select 1 from admin_users au where au.user_id = auth.uid())
);

create policy "admin_write"
on instagram_accounts
for all
using (
  exists (select 1 from admin_users au where au.user_id = auth.uid())
)
with check (
  exists (select 1 from admin_users au where au.user_id = auth.uid())
);

drop policy if exists "admins_manage_admin_users" on admin_users;

create policy "admins_manage_admin_users"
on admin_users
for all
using (
  exists (select 1 from admin_users au where au.user_id = auth.uid())
)
with check (
  exists (select 1 from admin_users au where au.user_id = auth.uid())
);
