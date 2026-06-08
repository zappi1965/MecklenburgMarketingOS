
-- MMOS v18 Admin Profiles + Package Info Patch

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text unique not null,
  email text unique,
  role text not null default 'admin',
  permissions jsonb not null default '{"all": true}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.admin_profiles (display_name, email, role, permissions)
values
('DominiqueMM','dominique@mm.local','admin','{"all": true}'::jsonb),
('JanneMM','janne@mm.local','admin','{"all": true}'::jsonb)
on conflict (display_name) do update
set email = excluded.email,
    role = excluded.role,
    permissions = excluded.permissions;

alter table public.customer_notes add column if not exists actor_name text default 'DominiqueMM';
alter table public.customer_files add column if not exists actor_name text default 'DominiqueMM';
alter table public.activity_logs add column if not exists actor_name text default 'DominiqueMM';
alter table public.file_versions add column if not exists actor_name text default 'DominiqueMM';
alter table public.ticket_messages add column if not exists sender_role text default 'DominiqueMM';

update public.customer_notes set actor_name = 'DominiqueMM' where actor_name is null or actor_name in ('Admin','admin');
update public.customer_files set actor_name = 'DominiqueMM' where actor_name is null or actor_name in ('Admin','admin');
update public.activity_logs set actor_name = 'DominiqueMM' where actor_name is null or actor_name in ('Admin','admin');
update public.file_versions set actor_name = 'DominiqueMM' where actor_name is null or actor_name in ('Admin','admin');
update public.ticket_messages set sender_role = 'DominiqueMM' where sender_role in ('Admin','admin');

create table if not exists public.package_feature_catalog (
  id uuid primary key default gen_random_uuid(),
  package_name text not null,
  feature_key text not null,
  description text not null,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  unique(package_name, feature_key)
);

insert into public.package_feature_catalog (package_name, feature_key, description, sort_order)
values
('Starter','CRM','Kundendaten, Kontaktinfos und zentrale Kundenübersicht.',1),
('Starter','Tickets','Support-Tickets erstellen, beantworten und archivieren.',2),
('Starter','Rechnungen','Rechnungen ansehen, erstellen und Status verfolgen.',3),
('Starter','Media Center','Dateien, PDFs, Bilder und Dokumente zentral verwalten.',4),

('Growth','CRM','Kundendaten, Kontaktinfos und zentrale Kundenübersicht.',1),
('Growth','Tickets','Support-Tickets erstellen, beantworten und archivieren.',2),
('Growth','Rechnungen','Rechnungen ansehen, erstellen und Status verfolgen.',3),
('Growth','Media Center','Dateien, PDFs, Bilder und Dokumente zentral verwalten.',4),
('Growth','SEO','SEO-Werte, Sichtbarkeit und Wachstum im Kundenbereich anzeigen.',5),
('Growth','Booking','Termine, Tagesansichten und Kundenbuchungen verwalten.',6),
('Growth','Pipeline','Angebote, Deals und Verkaufschancen verwalten.',7),
('Growth','Integrationen','Marketing-Tools wie Google Business oder Analytics hinterlegen.',8),
('Growth','Reports','Monatsberichte und Auswertungen vorbereiten.',9),

('Premium','CRM','Kundendaten, Kontaktinfos und zentrale Kundenübersicht.',1),
('Premium','Tickets','Support-Tickets erstellen, beantworten und archivieren.',2),
('Premium','Rechnungen','Rechnungen ansehen, erstellen und Status verfolgen.',3),
('Premium','Media Center','Dateien, PDFs, Bilder und Dokumente zentral verwalten.',4),
('Premium','SEO','SEO-Werte, Sichtbarkeit und Wachstum im Kundenbereich anzeigen.',5),
('Premium','Booking','Termine, Tagesansichten und Kundenbuchungen verwalten.',6),
('Premium','Pipeline','Angebote, Deals und Verkaufschancen verwalten.',7),
('Premium','Integrationen','Marketing-Tools wie Google Business oder Analytics hinterlegen.',8),
('Premium','Reports','Monatsberichte und Auswertungen vorbereiten.',9),
('Premium','Automationen','Regeln und automatische Abläufe für wiederkehrende Prozesse.',10),
('Premium','Workflows','Vordefinierte Abläufe starten und dokumentieren.',11),
('Premium','Rechte','Toolzugriffe und Berechtigungen gezielt steuern.',12),
('Premium','Review Funnel','Bewertungsprozesse und Review-Anfragen automatisieren.',13)
on conflict (package_name, feature_key) do update
set description = excluded.description,
    sort_order = excluded.sort_order;
