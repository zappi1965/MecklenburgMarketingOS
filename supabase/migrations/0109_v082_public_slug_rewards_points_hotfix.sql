-- MMOS V082: Public Slug Punkte/Rewards Hotfix
-- Härtet die Tabellen ab, die die öffentliche /l/[slug]-Seite beim Punkte sammeln und Reward-Anzeigen nutzt.

create extension if not exists "pgcrypto";

alter table if exists public.loyalty_customers add column if not exists device_id text;
alter table if exists public.loyalty_customers add column if not exists total_points integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table if exists public.loyalty_customers add column if not exists updated_at timestamptz default now();
alter table if exists public.loyalty_customers add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.loyalty_transactions add column if not exists description text;
alter table if exists public.loyalty_transactions add column if not exists source text default 'qr';
alter table if exists public.loyalty_transactions add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.loyalty_rewards add column if not exists title text;
alter table if exists public.loyalty_rewards add column if not exists name text;
alter table if exists public.loyalty_rewards add column if not exists status text default 'active';
alter table if exists public.loyalty_rewards add column if not exists active boolean default true;
alter table if exists public.loyalty_rewards add column if not exists is_deleted boolean not null default false;
alter table if exists public.loyalty_rewards add column if not exists deleted_at timestamptz;
alter table if exists public.loyalty_rewards add column if not exists archived_at timestamptz;
alter table if exists public.loyalty_rewards add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.loyalty_rewards add column if not exists updated_at timestamptz default now();

alter table if exists public.v33_public_leads add column if not exists loyalty_program_id uuid;
alter table if exists public.v33_public_leads add column if not exists loyalty_customer_id uuid;
alter table if exists public.v33_public_leads add column if not exists qr_campaign_id uuid;
alter table if exists public.v33_public_leads add column if not exists slug text;
alter table if exists public.v33_public_leads add column if not exists source text;
alter table if exists public.v33_public_leads add column if not exists status text default 'new';
alter table if exists public.v33_public_leads add column if not exists points_added integer default 0;
alter table if exists public.v33_public_leads add column if not exists points_balance integer default 0;
alter table if exists public.v33_public_leads add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.qr_campaigns add column if not exists points_per_scan integer default 0;
alter table if exists public.qr_campaigns add column if not exists require_rescan_for_points boolean default true;
alter table if exists public.qr_campaigns add column if not exists rotate_qr_after_scan boolean default false;
alter table if exists public.qr_campaigns add column if not exists metadata jsonb default '{}'::jsonb;

-- Bestehende Reward-Zeilen mit leerem Titel lesbar machen.
update public.loyalty_rewards
set title = coalesce(nullif(title,''), nullif(name,''), nullif(metadata->>'title',''), nullif(metadata->>'name',''), nullif(description,''), 'Prämie'),
    name = coalesce(nullif(name,''), nullif(title,''), nullif(metadata->>'name',''), nullif(metadata->>'title',''), nullif(description,''), 'Prämie'),
    status = coalesce(nullif(status,''), case when active is false then 'deleted' else 'active' end),
    updated_at = now()
where title is null or title = '' or name is null or name = '' or status is null or status = '';

create index if not exists idx_loyalty_rewards_public_active
on public.loyalty_rewards(customer_id, loyalty_program_id, qr_campaign_id, active, is_deleted);
