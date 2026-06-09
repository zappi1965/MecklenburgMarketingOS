-- MMOS V080: sicherer Demo-Kunden-Migration-Hotfix
-- Ausführen, wenn 0106 wegen fehlender Loyalty-Spalten fehlgeschlagen ist.
-- Diese Datei enthält die korrigierte V079-Demo-Seed-Migration inklusive Schema-Hardening.

-- MMOS V079 Demo-Kunde: Starter-Paket + einzeln freigeschalteter Loyalty-Zugriff
-- Zweck: Ein sauberer Demo-Kunde für Verkaufsgespräche mit vereinfachtem Starter-Portal und sichtbarem Loyalty-Zusatzbereich.
-- Sicher wiederholbar: feste UUIDs + Upserts.

create extension if not exists "pgcrypto";

-- Minimale Spalten absichern, ohne vorhandene Daten zu zerstören.
alter table if exists public.customers add column if not exists package_name text default 'Starter';
alter table if exists public.customers add column if not exists contact_person text;
alter table if exists public.customers add column if not exists phone text;
alter table if exists public.customers add column if not exists website text;
alter table if exists public.customers add column if not exists address text;
alter table if exists public.customers add column if not exists city text;
alter table if exists public.customers add column if not exists notes text;
alter table if exists public.customers add column if not exists updated_at timestamptz default now();

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  package_key text default 'starter',
  package_name text default 'Starter',
  status text default 'active',
  billing_interval text default 'month',
  monthly_price numeric(12,2) default 199,
  amount numeric(12,2) default 199,
  currency text default 'EUR',
  provider text default 'manual',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.customer_subscriptions add column if not exists package_key text default 'starter';
alter table public.customer_subscriptions add column if not exists package_name text default 'Starter';
alter table public.customer_subscriptions add column if not exists status text default 'active';
alter table public.customer_subscriptions add column if not exists billing_interval text default 'month';
alter table public.customer_subscriptions add column if not exists monthly_price numeric(12,2) default 199;
alter table public.customer_subscriptions add column if not exists amount numeric(12,2) default 199;
alter table public.customer_subscriptions add column if not exists currency text default 'EUR';
alter table public.customer_subscriptions add column if not exists provider text default 'manual';
alter table public.customer_subscriptions add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.customer_subscriptions add column if not exists updated_at timestamptz default now();

create table if not exists public.customer_tool_access (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  tool_key text not null,
  enabled boolean default true,
  note text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(customer_id, tool_key)
);
alter table public.customer_tool_access add column if not exists note text;
alter table public.customer_tool_access add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.customer_tool_access add column if not exists updated_at timestamptz default now();

create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text not null default 'QR Kampagne',
  name text,
  slug text unique,
  public_url text,
  target_url text,
  purpose text default 'loyalty',
  status text default 'Aktiv',
  active boolean default true,
  scans integer default 0,
  conversions integer default 0,
  points_per_scan integer default 0,
  loyalty_enabled boolean default false,
  loyalty_program_id uuid,
  require_rescan_for_points boolean default true,
  rotate_qr_after_scan boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.qr_campaigns add column if not exists name text;
alter table public.qr_campaigns add column if not exists slug text;
alter table public.qr_campaigns add column if not exists public_url text;
alter table public.qr_campaigns add column if not exists target_url text;
alter table public.qr_campaigns add column if not exists purpose text default 'loyalty';
alter table public.qr_campaigns add column if not exists active boolean default true;
alter table public.qr_campaigns add column if not exists scans integer default 0;
alter table public.qr_campaigns add column if not exists conversions integer default 0;
alter table public.qr_campaigns add column if not exists points_per_scan integer default 0;
alter table public.qr_campaigns add column if not exists loyalty_enabled boolean default false;
alter table public.qr_campaigns add column if not exists loyalty_program_id uuid;
alter table public.qr_campaigns add column if not exists require_rescan_for_points boolean default true;
alter table public.qr_campaigns add column if not exists rotate_qr_after_scan boolean default false;
alter table public.qr_campaigns add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.qr_campaigns add column if not exists updated_at timestamptz default now();
create unique index if not exists idx_qr_campaigns_slug_unique on public.qr_campaigns(slug) where slug is not null;

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  qr_campaign_id uuid,
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  points_per_scan integer not null default 10,
  points_per_booking integer not null default 25,
  points_per_review integer not null default 40,
  public_url text,
  rules jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.loyalty_programs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_programs add column if not exists updated_at timestamptz not null default now();
alter table public.loyalty_programs add column if not exists customer_id uuid;
alter table public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table public.loyalty_programs add column if not exists name text not null default 'Loyalty Programm';
alter table public.loyalty_programs add column if not exists slug text;
alter table public.loyalty_programs add column if not exists status text not null default 'active';
alter table public.loyalty_programs add column if not exists points_per_scan integer not null default 10;
alter table public.loyalty_programs add column if not exists points_per_booking integer not null default 25;
alter table public.loyalty_programs add column if not exists points_per_review integer not null default 40;
alter table public.loyalty_programs add column if not exists public_url text;
alter table public.loyalty_programs add column if not exists rules jsonb not null default '{}'::jsonb;
alter table public.loyalty_programs add column if not exists created_at timestamptz not null default now();
create unique index if not exists loyalty_programs_slug_uidx on public.loyalty_programs(slug) where slug is not null;

create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid,
  display_name text,
  email text,
  phone text,
  member_token text unique not null,
  points_balance integer not null default 0,
  tier text not null default 'basic',
  consent_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.loyalty_customers add column if not exists customer_id uuid;
alter table public.loyalty_customers add column if not exists loyalty_program_id uuid;
alter table public.loyalty_customers add column if not exists display_name text;
alter table public.loyalty_customers add column if not exists email text;
alter table public.loyalty_customers add column if not exists phone text;
alter table public.loyalty_customers add column if not exists member_token text;
alter table public.loyalty_customers add column if not exists points_balance integer not null default 0;
alter table public.loyalty_customers add column if not exists tier text not null default 'basic';
alter table public.loyalty_customers add column if not exists consent_at timestamptz;
alter table public.loyalty_customers add column if not exists last_seen_at timestamptz;
alter table public.loyalty_customers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_customers add column if not exists created_at timestamptz not null default now();
create unique index if not exists loyalty_customers_member_token_uidx on public.loyalty_customers(member_token) where member_token is not null;

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid,
  loyalty_customer_id uuid,
  qr_campaign_id uuid,
  action text not null default 'scan',
  points integer not null default 0,
  source text not null default 'qr',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.loyalty_transactions add column if not exists action text default 'scan';
alter table public.loyalty_transactions add column if not exists source text default 'qr';
alter table public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.loyalty_transactions add column if not exists customer_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_program_id uuid;
alter table public.loyalty_transactions add column if not exists loyalty_customer_id uuid;
alter table public.loyalty_transactions add column if not exists qr_campaign_id uuid;
alter table public.loyalty_transactions add column if not exists points integer not null default 0;
alter table public.loyalty_transactions add column if not exists created_at timestamptz not null default now();

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  loyalty_program_id uuid,
  qr_campaign_id uuid,
  name text not null,
  description text,
  required_points integer not null default 100,
  reward_type text not null default 'discount',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.loyalty_rewards add column if not exists qr_campaign_id uuid;
alter table public.loyalty_rewards add column if not exists description text;
alter table public.loyalty_rewards add column if not exists required_points integer not null default 100;
alter table public.loyalty_rewards add column if not exists reward_type text not null default 'discount';
alter table public.loyalty_rewards add column if not exists active boolean not null default true;
alter table public.loyalty_rewards add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.loyalty_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  loyalty_customer_id uuid,
  reward_id uuid,
  qr_campaign_id uuid,
  points_spent numeric not null default 0,
  status text not null default 'Eingelöst',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.loyalty_reward_redemptions add column if not exists customer_id uuid;
alter table public.loyalty_reward_redemptions add column if not exists loyalty_customer_id uuid;
alter table public.loyalty_reward_redemptions add column if not exists reward_id uuid;
alter table public.loyalty_reward_redemptions add column if not exists qr_campaign_id uuid;
alter table public.loyalty_reward_redemptions add column if not exists points_spent numeric not null default 0;
alter table public.loyalty_reward_redemptions add column if not exists status text not null default 'Eingelöst';
alter table public.loyalty_reward_redemptions add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.loyalty_reward_redemptions add column if not exists created_at timestamptz not null default now();

create table if not exists public.monthly_reports (
  id text primary key default gen_random_uuid()::text,
  customer_id text,
  title text,
  status text default 'Fertig',
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  snapshot_date date default current_date,
  organic_traffic integer default 0,
  impressions integer default 0,
  clicks integer default 0,
  ctr numeric(6,2) default 0,
  top10_keywords integer default 0,
  created_at timestamptz not null default now()
);
alter table public.seo_snapshots add column if not exists customer_id uuid;
alter table public.seo_snapshots add column if not exists snapshot_date date default current_date;
alter table public.seo_snapshots add column if not exists organic_traffic integer default 0;
alter table public.seo_snapshots add column if not exists impressions integer default 0;
alter table public.seo_snapshots add column if not exists clicks integer default 0;
alter table public.seo_snapshots add column if not exists ctr numeric(6,2) default 0;
alter table public.seo_snapshots add column if not exists top10_keywords integer default 0;
alter table public.seo_snapshots add column if not exists created_at timestamptz not null default now();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  invoice_number text,
  amount numeric(12,2) default 0,
  status text default 'Offen',
  due_date date,
  created_at timestamptz not null default now()
);
alter table public.invoices add column if not exists customer_id uuid;
alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists amount numeric(12,2) default 0;
alter table public.invoices add column if not exists status text default 'Offen';
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists created_at timestamptz not null default now();

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  name text,
  file_type text,
  url text,
  version integer default 1,
  created_at timestamptz not null default now()
);
alter table public.customer_files add column if not exists customer_id uuid;
alter table public.customer_files add column if not exists name text;
alter table public.customer_files add column if not exists file_type text;
alter table public.customer_files add column if not exists url text;
alter table public.customer_files add column if not exists version integer default 1;
alter table public.customer_files add column if not exists created_at timestamptz not null default now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  title text,
  message text,
  created_at timestamptz not null default now()
);
alter table public.notifications add column if not exists customer_id uuid;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

-- Feste Demo-IDs
-- Kunde ist bewusst Starter, Loyalty wird nur über customer_tool_access freigeschaltet.
do $$
declare
  v_customer uuid := 'cafe0000-0000-4000-8000-000000000001';
  v_subscription uuid := 'cafe0000-0000-4000-8000-000000000002';
  v_qr uuid := 'cafe0000-0000-4000-8000-000000000010';
  v_program uuid := 'cafe0000-0000-4000-8000-000000000020';
  v_reward_1 uuid := 'cafe0000-0000-4000-8000-000000000031';
  v_reward_2 uuid := 'cafe0000-0000-4000-8000-000000000032';
  v_reward_3 uuid := 'cafe0000-0000-4000-8000-000000000033';
  v_member_1 uuid := 'cafe0000-0000-4000-8000-000000000041';
  v_member_2 uuid := 'cafe0000-0000-4000-8000-000000000042';
  v_member_3 uuid := 'cafe0000-0000-4000-8000-000000000043';
  v_member_4 uuid := 'cafe0000-0000-4000-8000-000000000044';
  t text;
begin
  insert into public.customers (id,name,branch,email,status,package_name,contact_person,phone,website,address,city,notes,updated_at)
  values (
    v_customer,
    'Demo Café Schwerin',
    'Café / Gastronomie',
    'demo-cafe-schwerin@mecklenburg-marketing.local',
    'Aktiv',
    'Starter',
    'Mara Beispiel',
    '+49 385 000000',
    'https://demo.mecklenburg-marketing.local/cafe-schwerin',
    'Altstadt 12',
    'Schwerin',
    'Demo-Kunde: Starter-Paket mit einzeln freigeschaltetem Loyalty-Zusatzbereich. Ideal für Verkaufsgespräche.',
    now()
  )
  on conflict (id) do update set
    name=excluded.name,
    branch=excluded.branch,
    email=excluded.email,
    status=excluded.status,
    package_name=excluded.package_name,
    contact_person=excluded.contact_person,
    phone=excluded.phone,
    website=excluded.website,
    address=excluded.address,
    city=excluded.city,
    notes=excluded.notes,
    updated_at=now();

  insert into public.customer_subscriptions (id,customer_id,package_key,package_name,status,billing_interval,monthly_price,amount,currency,provider,metadata,updated_at)
  values (v_subscription,v_customer,'starter','Starter','active','month',199,199,'EUR','manual',jsonb_build_object('demo',true,'loyalty_addon',true,'label','Starter + Loyalty Zusatzbereich'),now())
  on conflict (id) do update set
    customer_id=excluded.customer_id,
    package_key=excluded.package_key,
    package_name=excluded.package_name,
    status=excluded.status,
    billing_interval=excluded.billing_interval,
    monthly_price=excluded.monthly_price,
    amount=excluded.amount,
    currency=excluded.currency,
    provider=excluded.provider,
    metadata=excluded.metadata,
    updated_at=now();

  foreach t in array array['qr','public_landing','loyalty','loyalty_rewards','loyalty_rules','staff_codes','loyalty_segments','smart_loyalty','reports','finance','media']
  loop
    insert into public.customer_tool_access (customer_id,tool_key,enabled,note,metadata,updated_at)
    values (v_customer,t,true,'V079 Demo: Starter mit Loyalty-Zusatzbereich',jsonb_build_object('demo',true,'source','v079_demo_customer_starter_loyalty'),now())
    on conflict (customer_id,tool_key) do update set
      enabled=true,
      note=excluded.note,
      metadata=excluded.metadata,
      updated_at=now();
  end loop;

  insert into public.qr_campaigns (id,customer_id,title,name,slug,public_url,target_url,purpose,status,active,scans,conversions,points_per_scan,loyalty_enabled,loyalty_program_id,require_rescan_for_points,rotate_qr_after_scan,metadata,updated_at)
  values (
    v_qr,v_customer,'Stempelkarte & Bewertungs-QR','Stempelkarte & Bewertungs-QR','demo-cafe-schwerin-starter-loyalty',
    '/q/demo-cafe-schwerin-starter-loyalty','/q/demo-cafe-schwerin-starter-loyalty','loyalty','Aktiv',true,47,21,10,true,v_program,true,false,
    jsonb_build_object('demo',true,'package','Starter','loyalty_addon',true,'qr_scan_url','/q/demo-cafe-schwerin-starter-loyalty','landing_url','/l/demo-cafe-schwerin-starter-loyalty','security','Frischer Scan-Token erforderlich. Refresh bringt keine neuen Punkte.','kpi_note','47 Scans, 210 Punkte, 3 Prämien eingelöst'),
    now()
  )
  on conflict (id) do update set
    title=excluded.title,
    name=excluded.name,
    slug=excluded.slug,
    public_url=excluded.public_url,
    target_url=excluded.target_url,
    purpose=excluded.purpose,
    status=excluded.status,
    active=excluded.active,
    scans=excluded.scans,
    conversions=excluded.conversions,
    points_per_scan=excluded.points_per_scan,
    loyalty_enabled=excluded.loyalty_enabled,
    loyalty_program_id=excluded.loyalty_program_id,
    require_rescan_for_points=excluded.require_rescan_for_points,
    rotate_qr_after_scan=excluded.rotate_qr_after_scan,
    metadata=excluded.metadata,
    updated_at=now();

  insert into public.loyalty_programs (id,customer_id,qr_campaign_id,name,slug,status,points_per_scan,points_per_booking,points_per_review,public_url,rules,metadata,updated_at)
  values (
    v_program,v_customer,v_qr,'Demo Punktekarte','demo-cafe-schwerin-punktekarte','active',10,25,40,'/l/demo-cafe-schwerin-starter-loyalty',
    jsonb_build_object('require_rescan_for_points',true,'daily_scan_limit_per_member',1,'max_scans_per_member',1,'staff_confirmation_required',true),
    jsonb_build_object('demo',true,'starter_addon',true),now()
  )
  on conflict (id) do update set
    qr_campaign_id=excluded.qr_campaign_id,
    name=excluded.name,
    slug=excluded.slug,
    status=excluded.status,
    points_per_scan=excluded.points_per_scan,
    points_per_booking=excluded.points_per_booking,
    points_per_review=excluded.points_per_review,
    public_url=excluded.public_url,
    rules=excluded.rules,
    metadata=excluded.metadata,
    updated_at=now();

  insert into public.loyalty_rewards (id,customer_id,loyalty_program_id,qr_campaign_id,name,description,required_points,reward_type,active,metadata)
  values
    (v_reward_1,v_customer,v_program,v_qr,'Gratis Kaffee','Einlösbar ab 50 Punkten.',50,'free_item',true,jsonb_build_object('demo',true,'sort',1)),
    (v_reward_2,v_customer,v_program,v_qr,'10 % Frühstück','10 % Rabatt auf Frühstücksbestellungen.',80,'discount',true,jsonb_build_object('demo',true,'sort',2)),
    (v_reward_3,v_customer,v_program,v_qr,'Kaffee + Kuchen','Kleines Dankeschön für Stammkunden.',120,'bundle',true,jsonb_build_object('demo',true,'sort',3))
  on conflict (id) do update set
    loyalty_program_id=excluded.loyalty_program_id,
    qr_campaign_id=excluded.qr_campaign_id,
    name=excluded.name,
    description=excluded.description,
    required_points=excluded.required_points,
    reward_type=excluded.reward_type,
    active=excluded.active,
    metadata=excluded.metadata;

  insert into public.loyalty_customers (id,customer_id,loyalty_program_id,display_name,email,phone,member_token,points_balance,tier,consent_at,last_seen_at,metadata)
  values
    (v_member_1,v_customer,v_program,'Anna Demo','anna.demo@example.local',null,'demo-cafe-member-anna',70,'basic',now()-interval '22 days',now()-interval '1 day',jsonb_build_object('demo',true)),
    (v_member_2,v_customer,v_program,'Max Demo','max.demo@example.local',null,'demo-cafe-member-max',40,'basic',now()-interval '18 days',now()-interval '2 days',jsonb_build_object('demo',true)),
    (v_member_3,v_customer,v_program,'Lea Demo','lea.demo@example.local',null,'demo-cafe-member-lea',120,'vip',now()-interval '34 days',now()-interval '3 hours',jsonb_build_object('demo',true)),
    (v_member_4,v_customer,v_program,'Tom Demo','tom.demo@example.local',null,'demo-cafe-member-tom',20,'basic',now()-interval '9 days',now()-interval '5 days',jsonb_build_object('demo',true))
  on conflict (id) do update set
    loyalty_program_id=excluded.loyalty_program_id,
    display_name=excluded.display_name,
    email=excluded.email,
    member_token=excluded.member_token,
    points_balance=excluded.points_balance,
    tier=excluded.tier,
    consent_at=excluded.consent_at,
    last_seen_at=excluded.last_seen_at,
    metadata=excluded.metadata;

  delete from public.loyalty_transactions where customer_id=v_customer and metadata->>'seed'='v079';
  insert into public.loyalty_transactions (customer_id,loyalty_program_id,loyalty_customer_id,qr_campaign_id,action,points,source,metadata,created_at)
  values
    (v_customer,v_program,v_member_1,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079','label','Scan vor Ort'),now()-interval '14 days'),
    (v_customer,v_program,v_member_1,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079','label','Scan vor Ort'),now()-interval '9 days'),
    (v_customer,v_program,v_member_1,v_qr,'review',40,'google_review',jsonb_build_object('seed','v079','label','Google Bewertung'),now()-interval '8 days'),
    (v_customer,v_program,v_member_2,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079'),now()-interval '7 days'),
    (v_customer,v_program,v_member_2,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079'),now()-interval '6 days'),
    (v_customer,v_program,v_member_2,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079'),now()-interval '5 days'),
    (v_customer,v_program,v_member_3,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079'),now()-interval '4 days'),
    (v_customer,v_program,v_member_3,v_qr,'booking',25,'booking',jsonb_build_object('seed','v079'),now()-interval '3 days'),
    (v_customer,v_program,v_member_3,v_qr,'review',40,'google_review',jsonb_build_object('seed','v079'),now()-interval '2 days'),
    (v_customer,v_program,v_member_3,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079'),now()-interval '1 day'),
    (v_customer,v_program,v_member_4,v_qr,'scan',10,'qr',jsonb_build_object('seed','v079'),now()-interval '20 hours'),
    (v_customer,v_program,v_member_4,v_qr,'scan',25,'manual_bonus',jsonb_build_object('seed','v079','label','Demo Bonus'),now()-interval '5 hours');

  delete from public.loyalty_reward_redemptions where customer_id=v_customer and payload->>'seed'='v079';
  insert into public.loyalty_reward_redemptions (customer_id,loyalty_customer_id,reward_id,qr_campaign_id,points_spent,status,payload,created_at)
  values
    (v_customer,v_member_1,v_reward_1,v_qr,50,'Eingelöst',jsonb_build_object('seed','v079','staff_code','MM2026'),now()-interval '6 days'),
    (v_customer,v_member_3,v_reward_2,v_qr,80,'Eingelöst',jsonb_build_object('seed','v079','staff_code','CAFE10'),now()-interval '2 days'),
    (v_customer,v_member_3,v_reward_1,v_qr,50,'Eingelöst',jsonb_build_object('seed','v079','staff_code','MM2026'),now()-interval '1 day');

  insert into public.seo_snapshots (customer_id,snapshot_date,organic_traffic,impressions,clicks,ctr,top10_keywords)
  values
    (v_customer,current_date-interval '30 days',112,1820,84,4.61,8),
    (v_customer,current_date-interval '14 days',138,2210,112,5.07,11),
    (v_customer,current_date,164,2680,151,5.63,14);

  delete from public.invoices where invoice_number='DEMO-STARTER-LOYALTY-001';
  insert into public.invoices (customer_id,invoice_number,amount,status,due_date)
  values (v_customer,'DEMO-STARTER-LOYALTY-001',199,'Bezahlt',current_date-interval '7 days');

  insert into public.monthly_reports (id,customer_id,title,status,summary,metadata,updated_at)
  values ('demo-cafe-schwerin-report-001',v_customer::text,'Demo Monatsreport · Google & QR','Fertig','Demo Café Schwerin zeigt Starter-Basis mit Google Sichtbarkeit, QR Kampagne und einzeln freigeschaltetem Punkteprogramm.',jsonb_build_object('demo',true,'kpis',jsonb_build_object('qr_scans',47,'points',210,'redemptions',3)),now())
  on conflict (id) do update set title=excluded.title,status=excluded.status,summary=excluded.summary,metadata=excluded.metadata,updated_at=now();

  delete from public.customer_files where customer_id=v_customer and name in ('Demo Leistungsübersicht Starter + Loyalty.pdf','Demo QR-Aushang Café Schwerin.pdf');
  insert into public.customer_files (customer_id,name,file_type,url,version)
  values
    (v_customer,'Demo Leistungsübersicht Starter + Loyalty.pdf','report','/demo-files/starter-loyalty-leistungsuebersicht.pdf',1),
    (v_customer,'Demo QR-Aushang Café Schwerin.pdf','qr','/demo-files/demo-cafe-qr-aushang.pdf',1);

  insert into public.notifications (customer_id,title,message,created_at)
  values (v_customer,'Demo-Kunde erstellt','Starter-Paket mit Loyalty-Zusatzbereich, QR-KPIs, Reports und Rechnung wurde angelegt.',now());
end $$;
