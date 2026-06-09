-- MMOS V42.17 Business, Sales & Operations Tools
-- Optional schema for live Supabase persistence. The frontend still falls back locally if tables are missing.

create table if not exists knowledge_articles (
  id text primary key,
  title text not null,
  category text,
  summary text,
  content text,
  package_scope text,
  created_at timestamptz default now()
);

create table if not exists competitor_benchmarks (
  id text primary key,
  customer_id text,
  name text not null,
  rating numeric,
  reviews integer,
  visibility numeric,
  profile_score numeric,
  keywords jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

create table if not exists google_business_audits (
  id text primary key,
  customer_id text,
  business_name text,
  city text,
  branch text,
  website text,
  google_url text,
  rating numeric,
  reviews integer,
  score numeric,
  status text,
  summary text,
  findings jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists mini_audits (
  id text primary key,
  customer_id text,
  audit_id text,
  title text,
  status text,
  recommendations jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists prospect_leads (
  id text primary key,
  name text not null,
  branch text,
  city text,
  rating numeric,
  reviews integer,
  website text,
  google_url text,
  score numeric,
  status text,
  reasons jsonb default '[]'::jsonb,
  source text,
  created_at timestamptz default now()
);

create table if not exists generated_offers (
  id text primary key,
  customer_id text,
  title text,
  package_name text,
  amount numeric,
  setup_fee numeric,
  services jsonb default '[]'::jsonb,
  status text,
  created_at timestamptz default now()
);

create table if not exists generated_contracts (
  id text primary key,
  customer_id text,
  title text,
  package_name text,
  term text,
  scope text,
  dpa text,
  status text,
  created_at timestamptz default now()
);

create table if not exists dunning_cases (
  id text primary key,
  invoice_id text,
  customer_id text,
  level integer,
  status text,
  due_date date,
  message text,
  created_at timestamptz default now()
);

create table if not exists customer_health_scores (
  id text primary key,
  customer_id text,
  score numeric,
  status text,
  reasons jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);


-- MMOS V42.18 Akquise-Kampagnen-Center
-- Optional schema for live Supabase persistence. The UI continues to use local fallback if this table is missing.

create table if not exists acquisition_campaigns (
  id text primary key,
  name text not null,
  branch text,
  city text,
  goal text,
  channel text,
  status text default 'Aktiv',
  stage text default 'Neu',
  lead_ids jsonb default '[]'::jsonb,
  customer_ids jsonb default '[]'::jsonb,
  next_step text,
  follow_up_at date,
  notes text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table prospect_leads add column if not exists customer_id text;
alter table prospect_leads add column if not exists campaign_id text;

alter table google_business_audits add column if not exists prospect_lead_id text;
alter table mini_audits add column if not exists prospect_lead_id text;
alter table generated_offers add column if not exists prospect_lead_id text;
alter table generated_offers add column if not exists campaign_id text;
alter table generated_contracts add column if not exists prospect_lead_id text;
alter table generated_contracts add column if not exists campaign_id text;
