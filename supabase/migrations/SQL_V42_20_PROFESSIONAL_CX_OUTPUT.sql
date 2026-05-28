-- MMOS V42.20 Professional CX & Output Engine
-- Optional tables for guided onboarding, monthly reports, approval center, and branded output documents.

create table if not exists onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  status text default 'In Arbeit',
  steps jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  title text not null,
  summary text,
  status text default 'Entwurf',
  metrics jsonb default '{}'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  output_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  title text not null,
  type text default 'Freigabe',
  description text,
  status text default 'Offen',
  requested_by text,
  decided_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists output_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  ref_table text,
  ref_id uuid,
  title text not null,
  document_type text not null,
  status text default 'Entwurf',
  html_content text,
  pdf_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_onboarding_customer on onboarding_checklists(customer_id);
create index if not exists idx_monthly_reports_customer on monthly_reports(customer_id);
create index if not exists idx_approval_requests_customer on approval_requests(customer_id);
create index if not exists idx_output_documents_customer on output_documents(customer_id);
