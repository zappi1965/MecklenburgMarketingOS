-- MMOS V074 Hotfix
-- Repariert customer_tool_access.note Kompatibilität und erzwingt die vereinfachte Paketmatrix ohne settings-Abhängigkeit.

create table if not exists public.landing_page_settings (
  id text primary key,
  scope text not null default 'public_home',
  packages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landing_page_settings add column if not exists scope text default 'public_home';
alter table public.landing_page_settings add column if not exists packages jsonb not null default '{}'::jsonb;
alter table public.landing_page_settings add column if not exists created_at timestamptz not null default now();
alter table public.landing_page_settings add column if not exists updated_at timestamptz not null default now();
alter table public.landing_page_settings add column if not exists show_public_demo_button boolean default true;

create table if not exists public.customer_tool_access (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  tool_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_tool_access add column if not exists note text;
create index if not exists idx_customer_tool_access_customer_tool on public.customer_tool_access(customer_id, tool_key);

insert into public.landing_page_settings (id, scope, packages, updated_at)
values (
  'main',
  'public_home',
  jsonb_build_object(
    'Starter', jsonb_build_object(
      'headline','Starter',
      'price',199,
      'setupFee',399,
      'audience','Für Betriebe, die Google sichtbar machen und eine einfache QR-Kampagne ohne Punkteprogramm starten wollen.',
      'description','Google Business Optimierung mit SEO KPI Übersicht, Heatmap, QR-Code-Kampagne und Kundenübersicht für Reports/Rechnungen.',
      'features', jsonb_build_array('Google Business Optimierung','SEO KPI Übersicht','SEO Heatmap','QR-Code Kampagne ohne Punkteprogramm','Reports & Rechnungen im Kundenportal')
    ),
    'Growth', jsonb_build_object(
      'headline','Growth',
      'price',499,
      'setupFee',749,
      'audience','Für Betriebe, die zusätzlich Bewertungen, Punkteprogramm und Kundenbindung nutzen wollen.',
      'description','Alles aus Starter plus Bewertungen, Punkteprogramm, Kundenbindung, Einwilligungen und Kundenaktionen.',
      'features', jsonb_build_array('Alles aus Starter','Bewertungen aktiv sammeln','Punkteprogramm & Prämien','Kundenbindung','Einwilligungen & Kundenaktionen')
    ),
    'Premium', jsonb_build_object(
      'headline','Premium',
      'price',899,
      'setupFee',1199,
      'audience','Für Betriebe, die Kundenbindung, Automationen und Steuerung maximal ausbauen wollen.',
      'description','Alles aus Growth plus Bonusstufen, Rückhol-Chancen, Service Recovery, automatische Aktionen, KI-Empfehlungen und erweitertes Kundenportal.',
      'features', jsonb_build_array('Alles aus Growth','Bonusstufen & Regeln','Rückhol-Chancen & Service Recovery','Automatische Aktionen & KI-Empfehlungen','Kundenportal Pro & Umsatzübersicht')
    )
  ),
  now()
)
on conflict (id) do update set
  scope=excluded.scope,
  packages=excluded.packages,
  updated_at=now();

update public.customer_tool_access
set enabled=false,
    updated_at=now(),
    note=coalesce(note,'') || ' · V074: SumUp nicht mehr Bestandteil von Growth'
where tool_key in ('sumup_revenue_connection','SumUp Integration','SumUp Umsatzdaten')
  and enabled=true;
