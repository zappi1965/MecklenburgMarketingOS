-- MMOS V42.18 Akquise-Kampagnen-Center
-- Optional schema for live Supabase persistence. The UI continues to use local fallback if this table is missing.

create table if not exists acquisition_campaigns (
  id text primary key,
  name text not null,
  branch text,
  city text,
  goal text,
  channel text,
  status text default 'Aktiv',
  stage text default 'Neu',
  lead_ids jsonb default '[]'::jsonb,
  customer_ids jsonb default '[]'::jsonb,
  next_step text,
  follow_up_at date,
  notes text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table prospect_leads add column if not exists customer_id text;
alter table prospect_leads add column if not exists campaign_id text;

alter table google_business_audits add column if not exists prospect_lead_id text;
alter table mini_audits add column if not exists prospect_lead_id text;
alter table generated_offers add column if not exists prospect_lead_id text;
alter table generated_offers add column if not exists campaign_id text;
alter table generated_contracts add column if not exists prospect_lead_id text;
alter table generated_contracts add column if not exists campaign_id text;
