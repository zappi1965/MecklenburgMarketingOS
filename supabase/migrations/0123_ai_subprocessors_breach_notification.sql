-- Migration 0123: AI sub-processor entries + breach notification fields
-- Fixes H6 (AI sub-processors missing from Art. 30) and M6 (breach notification workflow)

-- H6: Seed global AI sub-processor entries (customer_id = null = global/platform-level).
-- These represent platform-wide sub-processors used by MMOS itself.
insert into public.data_processors (
  name, purpose, country_code, scc_required, status, dpa_version, metadata
) values
  (
    'Anthropic, Inc.',
    'KI-gestützte E-Mail-Entwürfe, CRM-Textvorschläge (aiCrmMailService)',
    'US',
    true,
    'active',
    'SCC 2021 (EU Standardvertragsklauseln)',
    '{"api_endpoint": "api.anthropic.com", "data_categories": ["name", "appointment_date", "open_invoice_amount"], "legal_basis": "Art. 28 DSGVO + SCC", "added_at": "2024-01-01"}'::jsonb
  ),
  (
    'OpenAI, L.L.C.',
    'KI-gestützte E-Mail-Entwürfe, CRM-Textvorschläge (Fallback, aiCrmMailService)',
    'US',
    true,
    'active',
    'SCC 2021 (EU Standardvertragsklauseln)',
    '{"api_endpoint": "api.openai.com", "data_categories": ["name", "appointment_date", "open_invoice_amount"], "legal_basis": "Art. 28 DSGVO + SCC", "added_at": "2024-01-01"}'::jsonb
  )
on conflict do nothing;

-- M6: Add breach notification fields to incidents (stored in v33_functional_records as payload).
-- Since incidents live in v33_functional_records.payload (jsonb), no schema change needed there.
-- Instead we create a dedicated breach_notifications table for 72h SLA tracking.
create table if not exists public.breach_notifications (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid references public.customers(id) on delete set null,
  incident_ref        text,                          -- local_id from v33_functional_records
  title               text not null,
  description         text,
  affected_data_categories  text[],
  estimated_affected_persons integer,
  discovered_at       timestamptz not null default now(),
  dpa_notified_at     timestamptz,                   -- null = not yet notified
  dpa_authority       text default 'Landesbeauftragter für Datenschutz Mecklenburg-Vorpommern',
  affected_persons_notified_at timestamptz,
  status              text not null default 'open'
    check (status in ('open', 'dpa_notified', 'closed', 'no_notification_required')),
  severity            text not null default 'high'
    check (severity in ('low', 'medium', 'high', 'critical')),
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_breach_notifications_customer on public.breach_notifications(customer_id);
create index if not exists idx_breach_notifications_status on public.breach_notifications(status);
create index if not exists idx_breach_notifications_discovered on public.breach_notifications(discovered_at);

alter table public.breach_notifications enable row level security;

-- Admins can manage all breach notifications.
create policy "breach_notifications_admin_all" on public.breach_notifications
  for all to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'super_admin') and status = 'active'
    )
  );
