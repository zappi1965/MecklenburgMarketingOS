
-- MMOS v20 Loyalty Staff Confirmation Codes
-- Mitarbeiter können Reward-Einlösungen mit einem Code bestätigen.
-- Codes werden im Kundenbereich pro Loyalty-Programm/QR-Kampagne festgelegt.

create table if not exists public.loyalty_staff_codes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  qr_campaign_id uuid,
  label text not null default 'Mitarbeiter-Code',
  code_hash text not null,
  code_hint text,
  active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  created_by text default 'Kunde',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loyalty_staff_codes enable row level security;

drop policy if exists loyalty_staff_codes_customer_access on public.loyalty_staff_codes;
create policy loyalty_staff_codes_customer_access on public.loyalty_staff_codes for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

alter table if exists public.loyalty_redemptions add column if not exists staff_code_id uuid;
alter table if exists public.loyalty_redemptions add column if not exists confirmed_by_label text;
alter table if exists public.loyalty_redemptions add column if not exists confirmed_at timestamptz;
alter table if exists public.loyalty_redemptions add column if not exists confirmation_method text;

alter table if exists public.loyalty_rewards add column if not exists staff_code_required boolean not null default false;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','loyalty_staff_confirmation_codes_applied','system','{"version":"0032"}'::jsonb)
on conflict do nothing;
