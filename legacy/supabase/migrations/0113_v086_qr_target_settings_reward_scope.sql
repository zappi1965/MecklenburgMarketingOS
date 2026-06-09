-- MMOS V086: QR Zielseite als einzige Quelle für Punkte/Prämien
-- - ergänzt optionale QR-Regelspalten
-- - sorgt dafür, dass öffentliche Rewards kampagnen-/programmgebunden sauber gefiltert werden können
-- - alte ungebundene Rewards werden nicht gelöscht, aber als intern markiert, damit neue QR-Seiten sie nicht öffentlich erben

alter table if exists public.qr_campaigns add column if not exists max_scans_per_member integer default 0;
alter table if exists public.qr_campaigns add column if not exists daily_scan_limit_per_member integer default 0;
alter table if exists public.qr_campaigns add column if not exists scan_cooldown_minutes integer default 0;
alter table if exists public.qr_campaigns add column if not exists daily_point_limit_per_member integer default 0;
alter table if exists public.qr_campaigns add column if not exists suspicion_score_threshold integer default 70;
alter table if exists public.qr_campaigns add column if not exists require_rescan_for_points boolean default true;
alter table if exists public.qr_campaigns add column if not exists rotate_qr_after_scan boolean default false;
alter table if exists public.qr_campaigns add column if not exists purpose text;
alter table if exists public.qr_campaigns add column if not exists mode text;
alter table if exists public.qr_campaigns add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.qr_campaigns add column if not exists updated_at timestamptz default now();

alter table if exists public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_programs add column if not exists points_per_scan integer default 10;
alter table if exists public.loyalty_programs add column if not exists daily_scan_limit_per_member integer default 0;
alter table if exists public.loyalty_programs add column if not exists daily_point_limit_per_member integer default 0;
alter table if exists public.loyalty_programs add column if not exists suspicion_score_threshold integer default 70;
alter table if exists public.loyalty_programs add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.loyalty_programs add column if not exists updated_at timestamptz default now();

alter table if exists public.loyalty_rewards add column if not exists customer_id uuid;
alter table if exists public.loyalty_rewards add column if not exists loyalty_program_id uuid;
alter table if exists public.loyalty_rewards add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_rewards add column if not exists name text;
alter table if exists public.loyalty_rewards add column if not exists title text;
alter table if exists public.loyalty_rewards add column if not exists description text;
alter table if exists public.loyalty_rewards add column if not exists required_points integer default 0;
alter table if exists public.loyalty_rewards add column if not exists points integer default 0;
alter table if exists public.loyalty_rewards add column if not exists reward_type text default 'free_item';
alter table if exists public.loyalty_rewards add column if not exists active boolean default true;
alter table if exists public.loyalty_rewards add column if not exists status text default 'active';
alter table if exists public.loyalty_rewards add column if not exists deleted_at timestamptz;
alter table if exists public.loyalty_rewards add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.loyalty_rewards add column if not exists updated_at timestamptz default now();

-- Neue Logik: öffentliche Prämien sollen pro QR-Zielseite gepflegt werden.
-- Ungebundene Alt-Rewards werden als intern markiert, statt sie zu löschen.
update public.loyalty_rewards
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('public_global', false, 'v086_note', 'Alt-Reward ohne QR-Zuordnung; bitte unter QR Zielseite neu zuordnen.'),
    updated_at = now()
where qr_campaign_id is null
  and loyalty_program_id is null
  and coalesce((metadata->>'public_global')::boolean, false) = false;

create index if not exists idx_loyalty_rewards_customer_qr_active on public.loyalty_rewards(customer_id, qr_campaign_id, active);
create index if not exists idx_loyalty_rewards_customer_program_active on public.loyalty_rewards(customer_id, loyalty_program_id, active);
