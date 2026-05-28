-- ============================================================
-- 0053_v42_demo_functional_fix.sql
-- Functional demo fixes: package matrix, loyalty editing support, reviews hub.
-- ============================================================

create extension if not exists pgcrypto;

alter table public.v33_functional_records add column if not exists customer_id uuid;
alter table public.v33_functional_records add column if not exists resource text not null default 'record';
alter table public.v33_functional_records add column if not exists local_id text;
alter table public.v33_functional_records add column if not exists title text;
alter table public.v33_functional_records add column if not exists status text not null default 'active';
alter table public.v33_functional_records add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.v33_functional_records add column if not exists created_at timestamptz not null default now();
alter table public.v33_functional_records add column if not exists updated_at timestamptz not null default now();

alter table public.loyalty_programs add column if not exists points_per_scan integer not null default 10;
alter table public.loyalty_programs add column if not exists require_staff_code boolean not null default true;
alter table public.loyalty_programs add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.review_feedback add column if not exists customer_id uuid;
alter table public.review_feedback add column if not exists rating integer;
alter table public.review_feedback add column if not exists sentiment text;
alter table public.review_feedback add column if not exists feedback_text text;
alter table public.review_feedback add column if not exists comment text;
alter table public.review_feedback add column if not exists reviewer_name text;
alter table public.review_feedback add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values (
  'System',
  'v42_demo_functional_fix_schema_applied',
  'system',
  '{"version":"0053_v42_demo_functional_fix"}'::jsonb
)
on conflict do nothing;
