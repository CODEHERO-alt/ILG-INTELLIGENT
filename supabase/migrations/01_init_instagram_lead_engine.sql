create type instagram_status as enum (
  'new',
  'queued',
  'contacted',
  'interested',
  'closed',
  'dead'
);

create table instagram_accounts (
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

create index on instagram_accounts(status);
create index on instagram_accounts(quality_score);

create function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_trigger
before update on instagram_accounts
for each row execute function set_updated_at();

alter table instagram_accounts enable row level security;

create policy "admin only"
on instagram_accounts
for all
using (auth.jwt() ->> 'role' = 'admin');
