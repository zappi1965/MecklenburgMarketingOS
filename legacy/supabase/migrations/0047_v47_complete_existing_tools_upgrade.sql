-- MMOS V47 Complete Existing Tools Upgrade
-- Setzt alle 12 priorisierten Bestandsbereiche als funktionale, verknuepfte Ausbaustufe um.

create table if not exists v47_heatmap_points (
  id text primary key,
  customer_id text,
  keyword text,
  area_label text,
  rank numeric,
  visibility numeric,
  recommendation text,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_slug_hub_settings (
  id text primary key,
  customer_id text,
  slug text,
  hero_title text,
  enabled_blocks jsonb default '[]'::jsonb,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_review_goals (
  id text primary key,
  customer_id text,
  monthly_goal integer default 10,
  target_rating numeric default 4.6,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_loyalty_goals (
  id text primary key,
  customer_id text,
  returning_goal integer default 20,
  avg_ticket numeric default 18,
  estimated_monthly_value numeric default 360,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_lead_audits (
  id text primary key,
  customer_id text,
  lead_id text,
  business_name text,
  city text,
  branch text,
  audit_score numeric,
  findings jsonb default '[]'::jsonb,
  recommended_package text,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_value_offers (
  id text primary key,
  customer_id text,
  customer_name text,
  title text,
  package_name text,
  monthly_price numeric,
  setup_fee numeric,
  value_score numeric,
  reason text,
  services jsonb default '[]'::jsonb,
  status text default 'Entwurf',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_tool_access_rules (
  id text primary key,
  customer_id text,
  tool_key text,
  package_scope text,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_customer_health_events (
  id text primary key,
  customer_id text,
  type text,
  note text,
  status text default 'Offen',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_automation_playbooks (
  id text primary key,
  customer_id text,
  name text,
  trigger_event text,
  action text,
  status text default 'Entwurf',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v47_media_report_links (
  id text primary key,
  customer_id text,
  title text,
  url text,
  type text,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_v47_heatmap_customer on v47_heatmap_points(customer_id);
create index if not exists idx_v47_slug_customer on v47_slug_hub_settings(customer_id);
create index if not exists idx_v47_review_goals_customer on v47_review_goals(customer_id);
create index if not exists idx_v47_loyalty_goals_customer on v47_loyalty_goals(customer_id);
create index if not exists idx_v47_lead_audits_customer on v47_lead_audits(customer_id);
create index if not exists idx_v47_value_offers_customer on v47_value_offers(customer_id);
create index if not exists idx_v47_tool_access_customer on v47_tool_access_rules(customer_id);
create index if not exists idx_v47_health_customer on v47_customer_health_events(customer_id);
create index if not exists idx_v47_automation_customer on v47_automation_playbooks(customer_id);
create index if not exists idx_v47_media_customer on v47_media_report_links(customer_id);

insert into v47_heatmap_points
(id, customer_id, keyword, area_label, rank, visibility, recommendation, is_demo)
values
('demo_v47_heat_1','demo_customer_friseur_hansekamm','friseur rostock','Innenstadt',3,86,'stark halten',true),
('demo_v47_heat_2','demo_customer_friseur_hansekamm','friseur rostock','KTV',7,65,'Google Beitrag + Leistung optimieren',true),
('demo_v47_heat_3','demo_customer_friseur_hansekamm','balayage rostock','Reutershagen',11,42,'Landingpage-Text und Fotos ausbauen',true)
on conflict (id) do update set rank = excluded.rank, visibility = excluded.visibility, recommendation = excluded.recommendation, is_demo = true, updated_at = now();

insert into v47_slug_hub_settings
(id, customer_id, slug, hero_title, enabled_blocks, status, is_demo)
values
('demo_v47_slug_salon','demo_customer_friseur_hansekamm','demo-friseur-hansekamm','Willkommen bei DEMO Friseur Hansekamm','["reviews","loyalty","rewards","booking","payments","referrals","contact"]'::jsonb,'Aktiv',true)
on conflict (id) do update set enabled_blocks = excluded.enabled_blocks, status = excluded.status, is_demo = true, updated_at = now();

insert into v47_review_goals
(id, customer_id, monthly_goal, target_rating, status, is_demo)
values
('demo_v47_review_goal_salon','demo_customer_friseur_hansekamm',12,4.7,'Aktiv',true)
on conflict (id) do update set monthly_goal = excluded.monthly_goal, target_rating = excluded.target_rating, is_demo = true, updated_at = now();

insert into v47_loyalty_goals
(id, customer_id, returning_goal, avg_ticket, estimated_monthly_value, status, is_demo)
values
('demo_v47_loyalty_goal_salon','demo_customer_friseur_hansekamm',20,38,760,'Aktiv',true)
on conflict (id) do update set estimated_monthly_value = excluded.estimated_monthly_value, is_demo = true, updated_at = now();

insert into v47_lead_audits
(id, customer_id, business_name, city, branch, audit_score, findings, recommended_package, is_demo)
values
('demo_v47_lead_audit_1','demo_customer_cafe_kuestenblick','DEMO Strandkiosk Warnemünde','Rostock','Gastronomie',71,'["wenige Bewertungen","keine QR-Kampagne erkennbar","Google Business ausbaufähig"]'::jsonb,'Growth',true)
on conflict (id) do update set audit_score = excluded.audit_score, is_demo = true, updated_at = now();

insert into v47_value_offers
(id, customer_id, customer_name, title, package_name, monthly_price, setup_fee, value_score, reason, services, status, is_demo)
values
('demo_v47_offer_salon','demo_customer_friseur_hansekamm','DEMO Friseur Hansekamm','Angebot Premium Ausbau','Premium',499,1199,78,'Starke Nutzung von QR/Loyalty und Bedarf bei Reputation/Termin-Auslastung.','["SEO Heatmap Pro","Review Center","Loyalty Growth","Value Dashboard"]'::jsonb,'Entwurf',true)
on conflict (id) do update set value_score = excluded.value_score, is_demo = true, updated_at = now();

insert into v47_tool_access_rules
(id, customer_id, tool_key, package_scope, status, is_demo)
values
('demo_v47_access_salon_heatmap','demo_customer_friseur_hansekamm','seo_heatmap_pro','Premium','Aktiv',true),
('demo_v47_access_salon_loyalty','demo_customer_friseur_hansekamm','loyalty_growth_center','Premium','Aktiv',true)
on conflict (id) do update set status = excluded.status, is_demo = true, updated_at = now();

insert into v47_customer_health_events
(id, customer_id, type, note, status, is_demo)
values
('demo_v47_health_salon_1','demo_customer_friseur_hansekamm','Upsell Chance','Termin- und Auslastungsmodul aktiv anbieten.','Offen',true)
on conflict (id) do update set status = excluded.status, is_demo = true, updated_at = now();

insert into v47_automation_playbooks
(id, customer_id, name, trigger_event, action, status, is_demo)
values
('demo_v47_auto_review','demo_customer_friseur_hansekamm','1-3 Sterne Feedback','review_low_rating','Ticket erstellen + interne Benachrichtigung','Aktiv',true),
('demo_v47_auto_rebooking','demo_customer_friseur_hansekamm','Rebooking nach 8 Wochen','appointment_age_8_weeks','Wiederbuchungsnachricht vorbereiten','Entwurf',true)
on conflict (id) do update set status = excluded.status, is_demo = true, updated_at = now();

insert into v47_media_report_links
(id, customer_id, title, url, type, status, is_demo)
values
('demo_v47_media_report_salon','demo_customer_friseur_hansekamm','DEMO Monatsreport Mai 2026','/reports/value/demo_value_report_hansekamm_052026','Value Report','Aktiv',true)
on conflict (id) do update set url = excluded.url, is_demo = true, updated_at = now();
