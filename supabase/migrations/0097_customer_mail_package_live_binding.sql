-- MMOS Live Binding: Customer lifecycle mails, package tool auto-grants, MecklenburgMarketing GbR defaults

create extension if not exists pgcrypto;

create table if not exists public.mail_events (
  id uuid primary key default gen_random_uuid(),
  customer_id text,
  recipient text not null,
  subject text,
  template_key text,
  provider text,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mail_events_customer_created on public.mail_events(customer_id, created_at desc);
create index if not exists idx_mail_events_template on public.mail_events(template_key);

alter table public.mail_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mail_events' and policyname='authenticated_mail_events') then
    create policy authenticated_mail_events on public.mail_events
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

alter table if exists public.customer_tool_access
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists enabled boolean not null default true,
  add column if not exists visible_to_customer boolean not null default true,
  add column if not exists source text,
  add column if not exists package_name text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_customer_tool_access_customer_tool
  on public.customer_tool_access(customer_id, tool_key);

alter table if exists public.customer_invites
  add column if not exists mail_last_sent_at timestamptz,
  add column if not exists mail_send_status text,
  add column if not exists auth_user_id text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.customer_registrations
  add column if not exists mail_status text,
  add column if not exists approved_mail_sent_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.customer_subscriptions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists package_key text,
  add column if not exists plan text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_customer_subscriptions_customer_id
  on public.customer_subscriptions(customer_id);
