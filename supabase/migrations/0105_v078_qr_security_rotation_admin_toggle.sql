-- V078 QR Security Hardening + optionale QR-Rotation
-- Sicher ausfuehrbar: keine Abhaengigkeit von nicht vorhandenen custom Spalten.

alter table if exists public.qr_campaigns add column if not exists title text;
alter table if exists public.qr_campaigns add column if not exists name text;
alter table if exists public.qr_campaigns add column if not exists slug text;
alter table if exists public.qr_campaigns add column if not exists target_url text;
alter table if exists public.qr_campaigns add column if not exists public_url text;
alter table if exists public.qr_campaigns add column if not exists purpose text;
alter table if exists public.qr_campaigns add column if not exists mode text;
alter table if exists public.qr_campaigns add column if not exists points_per_scan integer default 0;
alter table if exists public.qr_campaigns add column if not exists max_scans_per_member integer default 0;
alter table if exists public.qr_campaigns add column if not exists scan_cooldown_minutes integer default 0;
alter table if exists public.qr_campaigns add column if not exists daily_point_limit_per_member integer default 0;
alter table if exists public.qr_campaigns add column if not exists suspicion_score_threshold integer default 70;
alter table if exists public.qr_campaigns add column if not exists active boolean default true;
alter table if exists public.qr_campaigns add column if not exists status text default 'Aktiv';
alter table if exists public.qr_campaigns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.qr_campaigns add column if not exists updated_at timestamptz not null default now();

alter table if exists public.loyalty_programs add column if not exists slug text;
alter table if exists public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_programs add column if not exists points_per_scan integer default 0;
alter table if exists public.loyalty_programs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.loyalty_programs add column if not exists updated_at timestamptz not null default now();

-- Gedruckte/produktive QR-Codes zeigen immer auf /q/[slug]. /l/[slug] bleibt Vorschau/Zielseite.
update public.qr_campaigns
set
  target_url = '/q/' || slug,
  public_url = '/q/' || slug,
  metadata = coalesce(metadata,'{}'::jsonb)
    || jsonb_build_object('qr_scan_url','/q/' || slug, 'landing_url','/l/' || slug, 'v078_qr_security_hardened', true)
    || case
        when coalesce(points_per_scan, case when coalesce(metadata->>'points_per_scan','') ~ '^[0-9]+$' then (metadata->>'points_per_scan')::int else 0 end, 0) > 0
          and coalesce(purpose, mode, metadata->>'purpose', 'loyalty') <> 'review'
        then '{"require_rescan_for_points":true}'::jsonb
        else '{}'::jsonb
       end,
  updated_at = now()
where slug is not null and slug <> '';

-- Punkteprogramme bekommen standardmaessig Refresh-/Reload-Schutz.
update public.loyalty_programs
set
  metadata = coalesce(metadata,'{}'::jsonb) || '{"require_rescan_for_points":true,"v078_qr_security_hardened":true}'::jsonb,
  updated_at = now()
where coalesce(points_per_scan, case when coalesce(metadata->>'points_per_scan','') ~ '^[0-9]+$' then (metadata->>'points_per_scan')::int else 0 end, 0) > 0;

-- Historie fuer automatisch erzeugte Folge-QRs wird als v33 functional record gespeichert.
create table if not exists public.v33_functional_records (
  id text primary key,
  local_id text,
  resource text not null,
  customer_id uuid,
  title text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_v33_functional_records_qr_rotations
  on public.v33_functional_records(resource, customer_id, created_at desc)
  where resource = 'qr_rotations';
