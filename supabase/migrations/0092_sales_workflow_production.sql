-- MMOS Sales Workflow Production Tables

create table if not exists public.sales_workflows (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  status text not null default 'In Bearbeitung',
  current_step text,
  completed_steps jsonb not null default '[]'::jsonb,
  owner_name text,
  last_completed_step text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_workflows_customer_id on public.sales_workflows(customer_id);
create index if not exists idx_sales_workflows_status on public.sales_workflows(status);

create table if not exists public.sales_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  customer_id uuid,
  step_key text,
  title text not null,
  description text,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_workflow_events_customer_id on public.sales_workflow_events(customer_id);
create index if not exists idx_sales_workflow_events_workflow_id on public.sales_workflow_events(workflow_id);

create table if not exists public.sales_workflow_documents (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  customer_id uuid,
  document_type text not null,
  source_table text,
  source_id uuid,
  title text,
  status text not null default 'Entwurf',
  public_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_workflow_documents_customer_id on public.sales_workflow_documents(customer_id);
create index if not exists idx_sales_workflow_documents_workflow_id on public.sales_workflow_documents(workflow_id);

alter table public.sales_workflows enable row level security;
alter table public.sales_workflow_events enable row level security;
alter table public.sales_workflow_documents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sales_workflows' and policyname='authenticated_sales_workflows') then
    create policy authenticated_sales_workflows on public.sales_workflows for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sales_workflow_events' and policyname='authenticated_sales_workflow_events') then
    create policy authenticated_sales_workflow_events on public.sales_workflow_events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sales_workflow_documents' and policyname='authenticated_sales_workflow_documents') then
    create policy authenticated_sales_workflow_documents on public.sales_workflow_documents for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;
