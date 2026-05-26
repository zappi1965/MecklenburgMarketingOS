
-- MMOS v18 Demo Tables Functional Tools
-- Separate Demo-Tabellen für Demo-Workflows, Demo-QR-Kampagnen, Demo-Rechnungen/PDFs und Demo-Mails.

create table if not exists public.demo_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_id uuid,
  workflow_key text not null,
  title text not null,
  status text not null default 'running',
  progress integer not null default 0,
  message text,
  result jsonb not null default '{}'::jsonb,
  created_by text default 'Demo System',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.demo_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_id uuid,
  title text not null,
  message text not null,
  type text default 'demo',
  actor_name text default 'Demo System',
  avatar_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_id uuid,
  invoice_number text not null,
  service_type text default 'Demo Leistung',
  amount numeric(12,2) not null default 0,
  status text not null default 'Offen',
  pdf_url text,
  pdf_storage_path text,
  created_by text default 'Demo System',
  created_at timestamptz not null default now()
);

create table if not exists public.demo_qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_id uuid,
  name text not null,
  slug text not null unique,
  public_url text not null,
  redirect_url text,
  internal_email text,
  internal_threshold integer not null default 3,
  google_redirect_threshold integer not null default 4,
  qr_svg text,
  qr_png_base64 text,
  status text not null default 'active',
  created_by text default 'Demo System',
  created_at timestamptz not null default now()
);

create table if not exists public.demo_mail_jobs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  from_email text,
  subject text not null,
  html text,
  status text not null default 'pending',
  provider_response jsonb default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.demo_workflow_runs enable row level security;
alter table public.demo_notifications enable row level security;
alter table public.demo_invoices enable row level security;
alter table public.demo_qr_campaigns enable row level security;
alter table public.demo_mail_jobs enable row level security;

-- Demo-Tabellen sind bewusst Demo-Sandbox. Lesen für anon erlaubt, Schreiben über Service Role/Backend.
drop policy if exists demo_workflow_runs_anon_read on public.demo_workflow_runs;
create policy demo_workflow_runs_anon_read on public.demo_workflow_runs for select using (true);

drop policy if exists demo_notifications_anon_read on public.demo_notifications;
create policy demo_notifications_anon_read on public.demo_notifications for select using (true);

drop policy if exists demo_invoices_anon_read on public.demo_invoices;
create policy demo_invoices_anon_read on public.demo_invoices for select using (true);

drop policy if exists demo_qr_campaigns_anon_read on public.demo_qr_campaigns;
create policy demo_qr_campaigns_anon_read on public.demo_qr_campaigns for select using (true);

drop policy if exists demo_mail_jobs_anon_read on public.demo_mail_jobs;
create policy demo_mail_jobs_anon_read on public.demo_mail_jobs for select using (true);

insert into public.demo_workflow_runs (customer_name, workflow_key, title, status, progress, message, result, finished_at)
values
('Demo NordDach GmbH', 'invoice_overdue', 'Rechnung überfällig', 'completed', 100, 'Demo-Mahnlauf vorbereitet.', '{"demo":true}'::jsonb, now()),
('Demo Barber Lounge Rostock', 'monthly_report', 'Monatsreport fällig', 'completed', 100, 'Demo-Report erzeugt.', '{"demo":true}'::jsonb, now())
on conflict do nothing;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','demo_tables_functional_tools_applied','system','{"version":"0025"}'::jsonb)
on conflict do nothing;
