-- MMOS Security Core: Tenant Isolation, Document Engine v2, Job Queue
create extension if not exists pgcrypto;

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  customer_id uuid,
  actor_user_id uuid,
  idempotency_key text unique,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_queue_status_run_after on public.job_queue(status, run_after);
create index if not exists idx_job_queue_customer_id on public.job_queue(customer_id);

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  scope text not null default 'default',
  response jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(key, scope)
);

create index if not exists idx_idempotency_keys_expires_at on public.idempotency_keys(expires_at);

alter table if exists public.output_documents add column if not exists bucket text;
alter table if exists public.output_documents add column if not exists storage_path text;
alter table if exists public.output_documents add column if not exists filename text;
alter table if exists public.output_documents add column if not exists mime_type text;
alter table if exists public.output_documents add column if not exists size_bytes bigint;
alter table if exists public.output_documents add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.customer_files add column if not exists bucket text;
alter table if exists public.customer_files add column if not exists storage_path text;
alter table if exists public.customer_files add column if not exists metadata jsonb default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('generated-pdfs', 'generated-pdfs', false)
on conflict (id) do nothing;
