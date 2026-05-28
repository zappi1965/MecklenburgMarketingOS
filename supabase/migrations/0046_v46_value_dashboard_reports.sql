-- MMOS V46 Value Dashboard + Report Fullbuild
-- Verknuepft bestehende Daten zu einem Kundennutzen-Report.

create table if not exists v46_value_reports (
  id text primary key,
  customer_id text,
  customer_name text,
  period_label text,
  value_score numeric default 0,
  summary text,
  metrics jsonb default '{}'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  next_actions jsonb default '[]'::jsonb,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_v46_value_reports_customer_id on v46_value_reports(customer_id);
create index if not exists idx_v46_value_reports_is_demo on v46_value_reports(is_demo);

insert into v46_value_reports (
  id,
  customer_id,
  customer_name,
  period_label,
  value_score,
  summary,
  metrics,
  recommendations,
  next_actions,
  is_demo
) values (
  'demo_value_report_hansekamm_052026',
  'demo_customer_friseur_hansekamm',
  'DEMO Friseur Hansekamm',
  'Mai 2026',
  78,
  'DEMO Friseur Hansekamm erreicht einen Value Score von 78/100. Besonders stark sind QR-Kampagnen, Reviews, Loyalty-Kontakte und die lokale Sichtbarkeit fuer friseur rostock.',
  '{"qrScans":84,"qrConversions":12,"reviewCount":1,"avgRating":3,"avgVisibility":74,"loyaltyMembers":1,"referralLeads":1,"potentialValue":342}'::jsonb,
  '["Wartezeit-Feedback aktiv nachfassen.","Balayage-Keyword weiter ausbauen.","Empfehlungsaktion sichtbarer auf Slug-Seite platzieren.","Last-Minute Slot an Warteliste senden."]'::jsonb,
  '["1. Kritisches Feedback als Ticket abschliessen.","2. SEO Heatmap fuer Balayage Rostock auswerten.","3. Empfehlungslink DEMO-HANSE aktiv bewerben.","4. Freien Slot mit Warteliste verknuepfen."]'::jsonb,
  true
)
on conflict (id) do update set
  value_score = excluded.value_score,
  summary = excluded.summary,
  metrics = excluded.metrics,
  recommendations = excluded.recommendations,
  next_actions = excluded.next_actions,
  is_demo = true,
  updated_at = now();
