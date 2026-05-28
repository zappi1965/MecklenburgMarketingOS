
-- MMOS V25 AI Review Intelligence + Stability Fixes
-- KI-/regelbasierte Review-Analyse, Themen, Sentiment, Trends, CRM-/Ticket-Verknüpfung und robuste optionale Spalten.

create table if not exists public.review_intelligence_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique,
  total_reviews integer not null default 0,
  avg_rating numeric(3,2) not null default 0,
  sentiment_score integer not null default 0,
  positive_count integer not null default 0,
  neutral_count integer not null default 0,
  negative_count integer not null default 0,
  top_positive_topics jsonb not null default '[]'::jsonb,
  top_negative_topics jsonb not null default '[]'::jsonb,
  recurring_issues jsonb not null default '[]'::jsonb,
  recurring_praises jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now()
);

create table if not exists public.review_intelligence_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  review_feedback_id uuid,
  rating integer,
  sentiment text not null default 'neutral',
  sentiment_score integer not null default 0,
  detected_topics jsonb not null default '[]'::jsonb,
  issue_tags jsonb not null default '[]'::jsonb,
  praise_tags jsonb not null default '[]'::jsonb,
  summary text,
  suggested_response text,
  escalation_required boolean not null default false,
  source_module text not null default 'reviews',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.review_topic_dictionary (
  id uuid primary key default gen_random_uuid(),
  topic_key text unique not null,
  label text not null,
  topic_type text not null default 'neutral',
  keywords text[] not null default '{}',
  severity_weight integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.review_response_templates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  template_key text not null,
  label text not null,
  sentiment text not null default 'neutral',
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists public.review_feedback add column if not exists intelligence_status text not null default 'pending';
alter table if exists public.review_feedback add column if not exists sentiment text;
alter table if exists public.review_feedback add column if not exists detected_topics jsonb not null default '[]'::jsonb;
alter table if exists public.review_feedback add column if not exists suggested_response text;

-- Stabilitäts-/Kompatibilitätsspalten aus vorherigen Releases sicherstellen
alter table if exists public.invoices add column if not exists source_appointment_id uuid;
alter table if exists public.invoices add column if not exists service_category_id uuid;
alter table if exists public.pipeline_leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.tickets add column if not exists source text;
alter table if exists public.customer_subscriptions add column if not exists package_key text;
alter table if exists public.customer_subscriptions add column if not exists plan text;
alter table if exists public.customer_tool_access add column if not exists enabled boolean not null default true;

alter table public.review_intelligence_profiles enable row level security;
alter table public.review_intelligence_items enable row level security;
alter table public.review_topic_dictionary enable row level security;
alter table public.review_response_templates enable row level security;

drop policy if exists review_intelligence_profiles_access on public.review_intelligence_profiles;
create policy review_intelligence_profiles_access on public.review_intelligence_profiles for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists review_intelligence_items_access on public.review_intelligence_items;
create policy review_intelligence_items_access on public.review_intelligence_items for all
using (public.can_access_customer(customer_id))
with check (public.can_access_customer(customer_id));

drop policy if exists review_topic_dictionary_read on public.review_topic_dictionary;
create policy review_topic_dictionary_read on public.review_topic_dictionary
for select using (active = true);

drop policy if exists review_topic_dictionary_admin on public.review_topic_dictionary;
create policy review_topic_dictionary_admin on public.review_topic_dictionary
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists review_response_templates_access on public.review_response_templates;
create policy review_response_templates_access on public.review_response_templates for all
using (customer_id is null or public.can_access_customer(customer_id))
with check (customer_id is null or public.can_access_customer(customer_id));

insert into public.review_topic_dictionary (topic_key, label, topic_type, keywords, severity_weight)
values
('wait_time','Wartezeit','negative',array['wartezeit','gewartet','lange warten','zu langsam','verspätung','dauerte lange'],3),
('service_negative','Schlechter Service','negative',array['unfreundlich','schlechter service','ignoriert','arrogant','nicht geholfen'],4),
('price_negative','Preis Kritik','negative',array['zu teuer','preis','überteuert','abzocke','kosten'],2),
('quality_negative','Qualitätsproblem','negative',array['schlecht','kalt','kaputt','fehlerhaft','ungenießbar','mangelhaft'],4),
('cleanliness','Sauberkeit','negative',array['dreckig','schmutzig','unsauber','hygiene','klebrig'],4),
('service_positive','Guter Service','positive',array['freundlich','netter service','aufmerksam','hilfsbereit','kompetent'],2),
('quality_positive','Gute Qualität','positive',array['lecker','gut','toll','perfekt','hochwertig','super'],2),
('speed_positive','Schnelligkeit','positive',array['schnell','zügig','kurze wartezeit','sofort'],1),
('atmosphere_positive','Atmosphäre','positive',array['gemütlich','atmosphäre','ambiente','wohlgefühlt','schön'],1)
on conflict (topic_key) do update set
label=excluded.label,
topic_type=excluded.topic_type,
keywords=excluded.keywords,
severity_weight=excluded.severity_weight,
active=true;

insert into public.review_response_templates (customer_id, template_key, label, sentiment, body)
values
(null,'positive_default','Positive Bewertung bedanken','positive','Vielen Dank für das tolle Feedback! Wir freuen uns sehr, dass Sie zufrieden waren.'),
(null,'negative_default','Negative Bewertung entschärfen','negative','Vielen Dank für Ihr ehrliches Feedback. Es tut uns leid, dass Ihre Erfahrung nicht wie erwartet war. Wir prüfen den Vorgang intern und möchten uns verbessern.'),
(null,'neutral_default','Neutrale Bewertung beantworten','neutral','Vielen Dank für Ihr Feedback. Wir nehmen Ihre Rückmeldung ernst und arbeiten stetig daran, besser zu werden.')
on conflict do nothing;

insert into public.package_features (package_key, feature_key, label, description, category, included, limit_value, sort_order, tooltip)
values
('growth','review_intelligence','Review Intelligence','Automatische Auswertung von Bewertungen nach Sentiment, Themen und Handlungsbedarf.','Reviews',true,'Basis',36,'Erkennt Lob, Kritik und wiederkehrende Themen.'),
('premium','review_intelligence','AI Review Intelligence Plus','Erweiterte Review-Analyse mit Trends, Antwortvorschlägen und CRM-Warnungen.','Reviews',true,'Premium',37,'Verknüpft Reviews mit Tickets, Customer Health, CRM und AI Assistant.')
on conflict (package_key, feature_key) do update set
label=excluded.label, description=excluded.description, category=excluded.category, included=excluded.included, limit_value=excluded.limit_value, sort_order=excluded.sort_order, tooltip=excluded.tooltip;

insert into public.package_tools (package_key, tool_key, label, description, enabled_by_default, visible_to_customer, sort_order)
values
('growth','review_intelligence','Review Intelligence','Sentiment, Themen und Handlungsempfehlungen',true,true,37),
('premium','review_intelligence','AI Review Intelligence Plus','Trends, Antwortvorschläge und CRM-Warnungen',true,true,38)
on conflict (package_key, tool_key) do update set
label=excluded.label, description=excluded.description, enabled_by_default=excluded.enabled_by_default, visible_to_customer=excluded.visible_to_customer, sort_order=excluded.sort_order;

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','v25_ai_review_intelligence_stability_applied','system','{"version":"0037"}'::jsonb)
on conflict do nothing;
