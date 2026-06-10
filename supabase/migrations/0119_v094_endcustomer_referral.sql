-- MMOS V094: Endkunden-Referral ("Freunde werben")
-- Loyalty-Mitglied wirbt Freund per persönlichem Link/QR. Beide bekommen erst
-- dann Punkte, wenn der Freund tatsächlich beitritt UND das erste Mal scannt.
-- Idempotent. Kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.loyalty_referrals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  loyalty_program_id uuid,
  referrer_member_id uuid,
  referrer_token text,
  referrer_email text,
  referred_member_id uuid,
  referred_email text,
  referral_code text not null,
  status text not null default 'pending', -- pending | joined | credited | rejected
  referrer_points integer not null default 0,
  friend_points integer not null default 0,
  credited_at timestamptz,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_loyalty_referrals_customer on public.loyalty_referrals(customer_id);
create index if not exists idx_loyalty_referrals_code on public.loyalty_referrals(referral_code);
create index if not exists idx_loyalty_referrals_status on public.loyalty_referrals(status);
create index if not exists idx_loyalty_referrals_referred_email on public.loyalty_referrals(referred_email);

-- Anti-Dublette: gleicher Werber + gleiche Freund-E-Mail nur einmal offen.
create unique index if not exists uq_loyalty_referrals_referrer_email
  on public.loyalty_referrals(customer_id, referrer_member_id, referred_email)
  where referred_email is not null;

-- Anti-Doppel-Gutschrift.
create unique index if not exists uq_loyalty_referrals_idempotency
  on public.loyalty_referrals(idempotency_key)
  where idempotency_key is not null;

-- Anti-Abuse-/Bonus-Flags an den Loyalty-Settings (Tabelle v37_loyalty_settings).
do $$
begin
  if to_regclass('public.v37_loyalty_settings') is not null then
    alter table public.v37_loyalty_settings
      add column if not exists referral_require_friend_scan boolean not null default true,
      add column if not exists referral_self_referral_blocked boolean not null default true,
      add column if not exists referral_max_per_referrer integer not null default 0; -- 0 = unbegrenzt
  end if;
exception when others then raise notice 'v37_loyalty_settings referral flags skipped: %', sqlerrm; end $$;

alter table public.loyalty_referrals enable row level security;

-- RLS: Kunde sieht nur eigene Referrals, Admin sieht alles. Backend nutzt Service-Role.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='loyalty_referrals' and policyname='loyalty_referrals_self_or_admin'
  ) then
    create policy loyalty_referrals_self_or_admin on public.loyalty_referrals
      for select to authenticated
      using (
        coalesce(public.mmos_is_admin(), false)
        or customer_id = public.mmos_current_customer_id()
      );
  end if;
exception when others then raise notice 'loyalty_referrals policy skipped: %', sqlerrm; end $$;
