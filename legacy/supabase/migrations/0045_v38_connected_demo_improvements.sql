create extension if not exists pgcrypto;

create table if not exists public.v38_demo_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_key text not null,
  scope text,
  status text not null default 'ok',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v38_demo_events_customer_idx on public.v38_demo_events (customer_id, created_at desc);

alter table public.customer_timeline_events add column if not exists customer_id uuid;
alter table public.customer_timeline_events add column if not exists event_type text not null default 'event';
alter table public.customer_timeline_events add column if not exists title text not null default 'Event';
alter table public.customer_timeline_events add column if not exists description text;
alter table public.customer_timeline_events add column if not exists source_module text not null default 'system';
alter table public.customer_timeline_events add column if not exists severity text not null default 'info';
alter table public.customer_timeline_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_timeline_events add column if not exists created_at timestamptz not null default now();

alter table public.pipeline_leads add column if not exists customer_id uuid;
alter table public.pipeline_leads add column if not exists title text not null default 'Lead';
alter table public.pipeline_leads add column if not exists source text default 'manual';
alter table public.pipeline_leads add column if not exists stage text default 'new';
alter table public.pipeline_leads add column if not exists value numeric(12,2) not null default 0;
alter table public.pipeline_leads add column if not exists probability integer not null default 0;
alter table public.pipeline_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pipeline_leads add column if not exists created_at timestamptz not null default now();

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v38_connected_demo_improvements_schema_applied','system','{"version":"0045_v38_connected_demo_improvements","excluded":["onboarding_wizard","industry_templates"]}'::jsonb)
on conflict do nothing;
