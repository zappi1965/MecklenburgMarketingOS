
-- MMOS v20 Loyalty Reward Configuration
-- Reward-Typen, Regeln, Limits und Voucher-Logik.

alter table if exists public.loyalty_rewards add column if not exists reward_value numeric(12,2);
alter table if exists public.loyalty_rewards add column if not exists reward_unit text;
alter table if exists public.loyalty_rewards add column if not exists valid_from timestamptz;
alter table if exists public.loyalty_rewards add column if not exists valid_until timestamptz;
alter table if exists public.loyalty_rewards add column if not exists max_total_redemptions integer;
alter table if exists public.loyalty_rewards add column if not exists max_redemptions_per_member integer not null default 1;
alter table if exists public.loyalty_rewards add column if not exists min_scans_required integer not null default 0;
alter table if exists public.loyalty_rewards add column if not exists min_reviews_required integer not null default 0;
alter table if exists public.loyalty_rewards add column if not exists allowed_weekdays integer[] default null;
alter table if exists public.loyalty_rewards add column if not exists campaign_scope text not null default 'program';
alter table if exists public.loyalty_rewards add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_rewards add column if not exists redemption_mode text not null default 'voucher_code';
alter table if exists public.loyalty_rewards add column if not exists staff_confirmation_required boolean not null default true;
alter table if exists public.loyalty_rewards add column if not exists terms text;
alter table if exists public.loyalty_rewards add column if not exists sort_order integer not null default 0;

create table if not exists public.loyalty_reward_rule_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  config_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.loyalty_reward_rule_templates enable row level security;

drop policy if exists loyalty_reward_rule_templates_read on public.loyalty_reward_rule_templates;
create policy loyalty_reward_rule_templates_read on public.loyalty_reward_rule_templates
for select using (active = true);

drop policy if exists loyalty_reward_rule_templates_admin on public.loyalty_reward_rule_templates;
create policy loyalty_reward_rule_templates_admin on public.loyalty_reward_rule_templates
for all using (public.is_admin()) with check (public.is_admin());

insert into public.loyalty_reward_rule_templates (key, label, description, config_schema, sort_order)
values
('once_per_member','Nur einmal pro Endkunde','Reward kann pro Endkunde nur einmal eingelöst werden.','{"max_redemptions_per_member":1}'::jsonb,1),
('daily_limit','Tageslimit','Reward ist pro Tag begrenzt einlösbar.','{"daily_limit":10}'::jsonb,2),
('weekday_only','Nur bestimmte Wochentage','Reward ist nur an ausgewählten Wochentagen verfügbar.','{"allowed_weekdays":[1,2,3,4,5]}'::jsonb,3),
('min_scans','Mindestanzahl QR-Scans','Reward ist erst nach X QR-Scans verfügbar.','{"min_scans_required":3}'::jsonb,4),
('min_reviews','Bewertung erforderlich','Reward ist erst nach abgegebenem Feedback verfügbar.','{"min_reviews_required":1}'::jsonb,5),
('campaign_only','Nur bestimmte QR-Kampagne','Reward gilt nur für eine bestimmte QR-Kampagne.','{"campaign_scope":"campaign"}'::jsonb,6),
('birthday','Geburtstagsreward','Reward kann als Geburtstagsbonus genutzt werden.','{"reward_type":"birthday_bonus"}'::jsonb,7),
('vip_tier','VIP-Stufe erforderlich','Reward gilt erst ab einer bestimmten Loyalty-Stufe.','{"required_tier":"vip"}'::jsonb,8)
on conflict (key) do update set
label=excluded.label,
description=excluded.description,
config_schema=excluded.config_schema,
sort_order=excluded.sort_order,
active=true;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','loyalty_reward_config_applied','system','{"version":"0031"}'::jsonb)
on conflict do nothing;
