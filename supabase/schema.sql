
create extension if not exists "pgcrypto";

create table if not exists users (
  id text primary key,
  name text,
  email text unique not null,
  password_hash text not null,
  role text not null default 'staff',
  client_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists clients (
  id text primary key,
  name text not null,
  slug text unique not null,
  owner_email text,
  google_review_link text,
  demo_revenue int default 0,
  subscription_status text default 'trial',
  stripe_customer_id text,
  modules jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reviews (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  rating int check (rating between 1 and 5),
  name text,
  phone text,
  message text,
  status text default 'internal',
  created_at timestamptz default now()
);

create table if not exists leads (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  name text,
  company text,
  email text,
  phone text,
  status text default 'Neu',
  value text,
  priority text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists bookings (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  name text,
  service text,
  date text,
  time text,
  status text default 'bestätigt',
  created_at timestamptz default now()
);

create table if not exists social_posts (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  platform text,
  content text,
  date text,
  time text,
  status text default 'geplant',
  published_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists outreach (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  recipient text,
  subject text,
  body text,
  status text default 'geplant',
  opens int default 0,
  clicks int default 0,
  created_at timestamptz default now()
);

create table if not exists reputation_alerts (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  source text,
  title text,
  message text,
  severity text,
  status text default 'offen',
  created_at timestamptz default now()
);

create table if not exists reports (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  title text,
  summary text,
  status text default 'erstellt',
  created_at timestamptz default now()
);

create table if not exists qr_campaigns (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  name text,
  target_url text,
  qr_data_url text,
  scans int default 0,
  created_at timestamptz default now()
);

create table if not exists onboarding (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  title text,
  description text,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists proposals (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  title text,
  customer text,
  amount text,
  status text default 'Entwurf',
  created_at timestamptz default now()
);

create table if not exists files (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  provider text default 'local',
  filename text,
  original_name text,
  mime_type text,
  size int,
  url text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text,
  client_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_leads_client on leads(client_id);
create index if not exists idx_reviews_client on reviews(client_id);
create index if not exists idx_bookings_client on bookings(client_id);
create index if not exists idx_audit_logs_client on audit_logs(client_id);
