-- Referral / Empfehlungsprogramm.
-- Idempotent. Kann mehrfach ausgefuehrt werden.

create extension if not exists pgcrypto;

create table if not exists public.customer_referral_codes (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_customer_id uuid not null references public.customers(id) on delete cascade,
  referred_customer_id uuid not null references public.customers(id) on delete cascade,
  code text not null,
  status text not null default 'pending',
  confirmed_at timestamptz,
  reward_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(referrer_customer_id, referred_customer_id)
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_customer_id);
create index if not exists idx_referrals_referred on public.referrals(referred_customer_id);
create index if not exists idx_referrals_status on public.referrals(status);
create index if not exists idx_customer_referral_codes_code on public.customer_referral_codes(code);

alter table public.customer_referral_codes enable row level security;
alter table public.referrals enable row level security;

-- RLS: Kunden sehen nur ihre eigenen Codes und Referrals. Admins (via
-- mmos_is_admin) sehen alles. Service-Role-Zugriffe ueber das Backend
-- umgehen RLS ohnehin.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='customer_referral_codes' and policyname='referral_codes_self_or_admin'
  ) then
    create policy referral_codes_self_or_admin on public.customer_referral_codes
      for select to authenticated
      using (
        coalesce(public.mmos_is_admin(), false)
        or customer_id = public.mmos_current_customer_id()
      );
  end if;
exception when others then raise notice 'referral_codes policy skipped: %', sqlerrm; end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='referrals' and policyname='referrals_self_or_admin'
  ) then
    create policy referrals_self_or_admin on public.referrals
      for select to authenticated
      using (
        coalesce(public.mmos_is_admin(), false)
        or referrer_customer_id = public.mmos_current_customer_id()
        or referred_customer_id = public.mmos_current_customer_id()
      );
  end if;
exception when others then raise notice 'referrals policy skipped: %', sqlerrm; end $$;
