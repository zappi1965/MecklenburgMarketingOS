-- MMOS V084: Public Slug Punkte + Rewards Hardening
-- Ziel: Punkte-Speicherung auf /l/[slug] robuster machen und alte/gelöschte Rewards ausblenden.

create extension if not exists "pgcrypto";

-- Loyalty-Mitglieder: optionale Felder ergänzen, die öffentliche QR-Seite beim Punkte sammeln nutzt.
alter table if exists public.loyalty_customers add column if not exists display_name text;
alter table if exists public.loyalty_customers add column if not exists phone text;
alter table if exists public.loyalty_customers add column if not exists member_token text;
alter table if exists public.loyalty_customers add column if not exists points_balance integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists total_points integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists device_id text;
alter table if exists public.loyalty_customers add column if not exists tier text default 'basic';
alter table if exists public.loyalty_customers add column if not exists last_seen_at timestamptz;
alter table if exists public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table if exists public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.loyalty_customers add column if not exists created_at timestamptz not null default now();

-- Punkteverlauf: optionale Felder ergänzen. Fehlende Felder dürfen die Punktevergabe nicht blockieren.
alter table if exists public.loyalty_transactions add column if not exists customer_id uuid;
alter table if exists public.loyalty_transactions add column if not exists loyalty_program_id uuid;
alter table if exists public.loyalty_transactions add column if not exists loyalty_customer_id uuid;
alter table if exists public.loyalty_transactions add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_transactions add column if not exists action text default 'scan';
alter table if exists public.loyalty_transactions add column if not exists points integer not null default 0;
alter table if exists public.loyalty_transactions add column if not exists source text default 'qr';
alter table if exists public.loyalty_transactions add column if not exists description text;
alter table if exists public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.loyalty_transactions add column if not exists created_at timestamptz not null default now();

-- Rewards: Titel-/Statusfelder ergänzen und Anzeige normalisieren.
alter table if exists public.loyalty_rewards add column if not exists title text;
alter table if exists public.loyalty_rewards add column if not exists name text;
alter table if exists public.loyalty_rewards add column if not exists label text;
alter table if exists public.loyalty_rewards add column if not exists customer_id uuid;
alter table if exists public.loyalty_rewards add column if not exists loyalty_program_id uuid;
alter table if exists public.loyalty_rewards add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_rewards add column if not exists description text;
alter table if exists public.loyalty_rewards add column if not exists required_points integer not null default 100;
alter table if exists public.loyalty_rewards add column if not exists reward_type text default 'discount';
alter table if exists public.loyalty_rewards add column if not exists active boolean not null default true;
alter table if exists public.loyalty_rewards add column if not exists status text default 'active';
alter table if exists public.loyalty_rewards add column if not exists deleted_at timestamptz;
alter table if exists public.loyalty_rewards add column if not exists archived_at timestamptz;
alter table if exists public.loyalty_rewards add column if not exists is_deleted boolean not null default false;
alter table if exists public.loyalty_rewards add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.loyalty_rewards add column if not exists created_at timestamptz not null default now();
alter table if exists public.loyalty_rewards add column if not exists updated_at timestamptz default now();

update public.loyalty_rewards
set
  title = coalesce(nullif(title,''), nullif(name,''), nullif(label,''), nullif(metadata->>'title',''), nullif(metadata->>'name',''), nullif(description,''), 'Prämie'),
  name = coalesce(nullif(name,''), nullif(title,''), nullif(label,''), nullif(metadata->>'name',''), nullif(metadata->>'title',''), nullif(description,''), 'Prämie'),
  updated_at = now()
where true;

-- Alte gelöschte v33-Reward-Records sollen gleichnamige Tabellen-Rewards deaktivieren.
do $$
begin
  if to_regclass('public.v33_functional_records') is not null and to_regclass('public.loyalty_rewards') is not null then
    update public.loyalty_rewards lr
    set active = false,
        status = 'deleted',
        is_deleted = true,
        deleted_at = coalesce(lr.deleted_at, now()),
        updated_at = now()
    where exists (
      select 1
      from public.v33_functional_records r
      where r.resource = 'loyalty_rewards'
        and r.customer_id::text = lr.customer_id::text
        and (
          r.local_id::text = lr.id::text
          or r.payload->>'id' = lr.id::text
          or r.payload->>'local_id' = lr.id::text
          or (r.payload->>'title' is not null and r.payload->>'title' = coalesce(lr.title, lr.name))
          or (r.payload->>'name' is not null and r.payload->>'name' = coalesce(lr.name, lr.title))
        )
        and (
          coalesce(r.status,'') in ('deleted','gelöscht','geloescht','archived','archiviert','removed','inactive','inaktiv','disabled','deaktiviert')
          or coalesce((r.payload->>'active')::boolean, true) = false
          or coalesce((r.payload->>'is_deleted')::boolean, false) = true
          or r.payload ? 'deleted_at'
          or r.payload ? 'archived_at'
          or r.payload ? 'removed_at'
        )
    );
  end if;
exception when others then
  null;
end $$;

do $$
begin
  if to_regclass('public.loyalty_customers') is not null then
    create index if not exists idx_loyalty_customers_program_email on public.loyalty_customers(loyalty_program_id, email);
  end if;
  if to_regclass('public.loyalty_transactions') is not null then
    create index if not exists idx_loyalty_transactions_customer_member_action on public.loyalty_transactions(customer_id, loyalty_customer_id, action);
  end if;
  if to_regclass('public.loyalty_rewards') is not null then
    create index if not exists idx_loyalty_rewards_customer_active on public.loyalty_rewards(customer_id, active);
  end if;
end $$;
