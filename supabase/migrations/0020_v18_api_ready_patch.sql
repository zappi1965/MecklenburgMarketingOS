
-- MMOS v18 API Ready Patch

create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  provider text not null,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, provider)
);

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.api_sync_jobs add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.api_sync_jobs add column if not exists last_error text;
alter table public.api_sync_jobs add column if not exists processed_at timestamptz;

alter table public.mail_jobs add column if not exists last_error text;
alter table public.mail_jobs add column if not exists sent_at timestamptz;

alter table public.customer_files add column if not exists storage_path text;
alter table public.customer_files add column if not exists bucket text;
alter table public.customer_files add column if not exists mime_type text;
alter table public.customer_files add column if not exists size_bytes bigint;

alter table public.qr_campaigns add column if not exists qr_data_url text;
alter table public.qr_campaigns add column if not exists review_url text;

alter table public.integrations add column if not exists site_url text;
alter table public.integrations add column if not exists property_id text;
alter table public.integrations add column if not exists provider text;

alter table public.oauth_tokens enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists oauth_tokens_admin on public.oauth_tokens;
create policy oauth_tokens_admin on public.oauth_tokens
for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);

drop policy if exists stripe_events_admin on public.stripe_events;
create policy stripe_events_admin on public.stripe_events
for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
)
with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
);

insert into public.production_checks (key,status,note)
values
('api_ready_google','prepared','Google OAuth routes, token table, refresh and sync scaffolds are implemented.'),
('api_ready_stripe','prepared','Stripe checkout and webhook event storage are implemented.'),
('api_ready_gotenberg','prepared','Gotenberg convert-and-store flow is implemented.'),
('api_ready_mail_worker','prepared','Mail jobs are processed by worker when Resend ENV exists.')
on conflict (key) do update set status=excluded.status,note=excluded.note,updated_at=now();
