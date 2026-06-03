-- MMOS V083 QR Slug Token Context Hotfix
-- Optionaler Datenrepair für alte QR-/Loyalty-Verknüpfungen.
-- Code-Fix ist unabhängig davon wirksam; diese Migration hilft nur historischen Kampagnen.

alter table if exists public.qr_campaigns add column if not exists loyalty_program_id uuid;
alter table if exists public.qr_campaigns add column if not exists public_url text;
alter table if exists public.qr_campaigns add column if not exists target_url text;
alter table if exists public.qr_campaigns add column if not exists require_rescan_for_points boolean default true;
alter table if exists public.qr_campaigns add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.loyalty_programs add column if not exists qr_campaign_id uuid;
alter table if exists public.loyalty_programs add column if not exists public_url text;
alter table if exists public.loyalty_programs add column if not exists rules jsonb default '{}'::jsonb;
alter table if exists public.loyalty_programs add column if not exists metadata jsonb default '{}'::jsonb;

update public.qr_campaigns
set
  public_url = case when slug is not null then '/q/' || slug else public_url end,
  target_url = case when slug is not null then '/q/' || slug else target_url end,
  require_rescan_for_points = coalesce(require_rescan_for_points, true),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'qr_scan_url', case when slug is not null then '/q/' || slug else coalesce(public_url, target_url) end,
    'landing_url', case when slug is not null then '/l/' || slug else null end,
    'require_rescan_for_points', true
  )
where slug is not null;

-- Falls die QR-Kampagne bereits auf ein Loyalty-Programm zeigt, die Rückverknüpfung setzen.
update public.loyalty_programs lp
set
  qr_campaign_id = q.id,
  public_url = coalesce(lp.public_url, case when q.slug is not null then '/l/' || q.slug else lp.public_url end),
  rules = coalesce(lp.rules, '{}'::jsonb) || jsonb_build_object('require_rescan_for_points', true),
  metadata = coalesce(lp.metadata, '{}'::jsonb) || jsonb_build_object(
    'qr_campaign_slug', q.slug,
    'qr_scan_url', case when q.slug is not null then '/q/' || q.slug else null end,
    'landing_url', case when q.slug is not null then '/l/' || q.slug else lp.public_url end,
    'require_rescan_for_points', true
  )
from public.qr_campaigns q
where q.loyalty_program_id is not null
  and lp.id = q.loyalty_program_id
  and (lp.qr_campaign_id is null or lp.qr_campaign_id = q.id);

-- Falls ein Programm auf eine Kampagne zeigt, die QR-Kampagne ebenfalls zurückverknüpfen.
update public.qr_campaigns q
set loyalty_program_id = lp.id
from public.loyalty_programs lp
where lp.qr_campaign_id = q.id
  and (q.loyalty_program_id is null or q.loyalty_program_id = lp.id);
