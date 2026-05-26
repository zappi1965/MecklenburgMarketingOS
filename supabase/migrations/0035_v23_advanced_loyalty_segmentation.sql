
-- MMOS V23 Advanced Loyalty & Segmentation
-- Endkunden-Segmente, VIP-Level, dynamische Punkte-Regeln, Loyalty Aktionen und Kampagnenverknüpfung.

create table if not exists public.loyalty_segments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  name text not null,
  segment_key text not null,
  description text,
  rule_config jsonb not null default '{}'::jsonb,
  member_count integer not null default 0,
  active boolean not null default true,
  color text default '#7c3aed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, loyalty_program_id, segment_key)
);

create table if not exists public.loyalty_member_segments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  loyalty_customer_id uuid references public.loyalty_customers(id) on delete cascade,
  segment_id uuid references public.loyalty_segments(id) on delete cascade,
  assigned_reason text,
  assigned_at timestamptz not null default now(),
  unique(loyalty_customer_id, segment_id)
);

create table if not exists public.loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  tier_key text not null,
  name text not null,
  description text,
  min_points integer not null default 0,
  min_scans integer not null default 0,
  min_reviews integer not null default 0,
  multiplier numeric(6,2) not null default 1.00,
  benefits jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(loyalty_program_id, tier_key)
);

create table if not exists public.loyalty_point_rules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  qr_campaign_id uuid,
  name text not null,
  rule_type text not null default 'bonus',
  trigger_key text not null default 'qr_scan',
  points_delta integer not null default 0,
  multiplier numeric(6,2) not null default 1.00,
  condition_config jsonb not null default '{}'::jsonb,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  priority integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_smart_actions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid references public.loyalty_programs(id) on delete cascade,
  segment_id uuid references public.loyalty_segments(id) on delete set null,
  name text not null,
  action_type text not null default 'reactivation',
  status text not null default 'draft',
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  qr_campaign_id uuid,
  marketing_campaign_id uuid,
  message_config jsonb not null default '{}'::jsonb,
  trigger_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.loyalty_customers add column if not exists current_tier text not null default 'basic';
alter table if exists public.loyalty_customers add column if not exists total_scans integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists total_reviews integer not null default 0;
alter table if exists public.loyalty_customers add column if not exists last_activity_at timestamptz;
alter table if exists public.loyalty_customers add column if not exists segment_summary jsonb not null default '[]'::jsonb;

alter table public.loyalty_segments enable row level security;
alter table public.loyalty_member_segments enable row level security;
alter table public.loyalty_tiers enable row level security;
alter table public.loyalty_point_rules enable row level security;
alter table public.loyalty_smart_actions enable row level security;

drop policy if exists loyalty_segments_access on public.loyalty_segments;
create policy loyalty_segments_access on public.loyalty_segments for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists loyalty_member_segments_access on public.loyalty_member_segments;
create policy loyalty_member_segments_access on public.loyalty_member_segments for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists loyalty_tiers_access on public.loyalty_tiers;
create policy loyalty_tiers_access on public.loyalty_tiers for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists loyalty_point_rules_access on public.loyalty_point_rules;
create policy loyalty_point_rules_access on public.loyalty_point_rules for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));
drop policy if exists loyalty_smart_actions_access on public.loyalty_smart_actions;
create policy loyalty_smart_actions_access on public.loyalty_smart_actions for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('growth','loyalty_segments','Loyalty Segmente','Automatische Endkundensegmente wie VIP, inaktiv oder review-aktiv.','Kundenbindung',true,'Basis',29,'Segmentierung der Endkunden innerhalb eines Loyalty-Programms.'),
('premium','loyalty_segments','Advanced Loyalty Segmente','Erweiterte Segmente, VIP-Level und Smart Actions.','Kundenbindung',true,'Premium',30,'Dynamische Zielgruppen für Kampagnen, Rewards und Marketing Automation.'),
('premium','smart_loyalty_v2','Smart Loyalty V2','Dynamische Punkte, VIP-Level, Reaktivierung und Bonusregeln.','Kundenbindung',true,'Premium',31,'Loyalty-Regeln abhängig von Scans, Reviews, Uhrzeit, Kampagne und Segment.')
on conflict (package_key, feature_key) do update set
label=excluded.label, description=excluded.description, category=excluded.category, included=excluded.included, limit_value=excluded.limit_value, sort_order=excluded.sort_order, tooltip=excluded.tooltip;

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('growth','loyalty_segments','Loyalty Segmente','Automatische Endkunden-Segmente',true,true,30),
('premium','loyalty_segments','Advanced Loyalty Segmente','Segmente, VIP-Level und Zielgruppen',true,true,31),
('premium','smart_loyalty_v2','Smart Loyalty V2','Dynamische Punkte- und Bonusregeln',true,true,32)
on conflict (package_key, tool_key) do update set
label=excluded.label, description=excluded.description, enabled_by_default=excluded.enabled_by_default, visible_to_customer=excluded.visible_to_customer, sort_order=excluded.sort_order;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v23_advanced_loyalty_segmentation_applied','system','{"version":"0035"}'::jsonb)
on conflict do nothing;
