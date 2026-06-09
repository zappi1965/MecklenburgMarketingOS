create extension if not exists pgcrypto;

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(),
  customer_id text,
  customer_name text,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  reviewer_name text,
  customer_email text,
  source text not null default 'public_review_page',
  google_review_url text,
  status text not null default 'new',
  is_demo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_feedback_customer_id_idx
  on public.review_feedback(customer_id);

create index if not exists review_feedback_rating_idx
  on public.review_feedback(rating);

create index if not exists review_feedback_status_idx
  on public.review_feedback(status);

create index if not exists review_feedback_created_at_idx
  on public.review_feedback(created_at desc);

alter table public.review_feedback enable row level security;

drop policy if exists "service role can manage review feedback" on public.review_feedback;

create policy "service role can manage review feedback"
  on public.review_feedback
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.mmos_system_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  event_label text,
  severity text not null default 'info',
  source text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mmos_system_events_event_key_idx
  on public.mmos_system_events(event_key);

create index if not exists mmos_system_events_created_at_idx
  on public.mmos_system_events(created_at desc);

alter table public.mmos_system_events enable row level security;

drop policy if exists "service role can manage system events" on public.mmos_system_events;

create policy "service role can manage system events"
  on public.mmos_system_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.mmos_system_events (
  event_key,
  event_label,
  severity,
  source,
  payload
)
values (
  'v061_live_fullbuild',
  'MMOS V061 Live Fullbuild angewendet',
  'info',
  'migration',
  jsonb_build_object(
    'version', 'v061',
    'scope', 'health_api, review_feedback, build_guard, env_hardening',
    'applied_at', now()
  )
);
