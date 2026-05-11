-- Demo/Admin/Kunden Startdaten
-- Diese Datei nach 0001_complete_fullstack_login_tools.sql ausführen.

insert into public.customers(name, contact_name, email, phone, status, branch, revenue, rating)
values
('Demo Friseur Rostock','Max Mustermann','demo-friseur@example.de','0381 123456','Aktiv','Beauty',2480,4.8),
('Echter Kunde Mustermann','Erika Mustermann','kontakt@mustermann.de','0381 000000','Aktiv','',0,0)
on conflict do nothing;

insert into public.service_categories(customer_id,name,price)
select id,'Fade Cut',29 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.service_categories(customer_id,name,price)
select id,'Damen Haarschnitt',49 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.appointments(customer_id, client_name, appointment_date, start_time, end_time, notes)
select id,'Anna Müller',current_date,'09:00','10:00','Demo-Termin' from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.invoices(invoice_number, customer_id, amount, status, service)
select 'RE-DEMO-001', id, 499, 'Offen', 'SEO Betreuung' from public.customers where name='Demo Friseur Rostock'
on conflict(invoice_number) do nothing;

insert into public.invoices(invoice_number, customer_id, amount, status, service)
select 'RE-DEMO-002', id, 299, 'Bezahlt', 'Review Kampagne' from public.customers where name='Demo Friseur Rostock'
on conflict(invoice_number) do nothing;

insert into public.tickets(customer_id, title, description, status)
select id,'Demo Support Ticket','Bitte Öffnungszeiten im Google Profil aktualisieren.','in Bearbeitung' from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.qr_campaigns(customer_id,name,target_url,negative_feedback_email,scans)
select id,'Demo Friseur Rostock','/review/demo-friseur-rostock','feedback@demo-friseur.de',84 from public.customers where name='Demo Friseur Rostock'
on conflict do nothing;

insert into public.integrations(customer_id, platform, api_key)
select id,'Google Business','demo_google_business_key' from public.customers where name='Demo Friseur Rostock'
on conflict(customer_id, platform) do nothing;

insert into public.lead_searches(name,branch,area,status,seven_day_trend)
values ('Werkstatt Schwerin','Werkstatt','Schwerin','Aktiv',5)
on conflict do nothing;