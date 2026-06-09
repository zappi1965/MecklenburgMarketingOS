-- MMOS V45 Stability + Demo Data
-- Fuellt die neuen V44-Tools mit Demo-Daten und stellt sicher, dass Live/Demo ueber is_demo getrennt werden kann.

alter table if exists local_listings add column if not exists is_demo boolean default false;
alter table if exists booking_slots add column if not exists is_demo boolean default false;
alter table if exists booking_waitlist add column if not exists is_demo boolean default false;
alter table if exists rebooking_reminders add column if not exists is_demo boolean default false;
alter table if exists unified_messages add column if not exists is_demo boolean default false;
alter table if exists payment_links add column if not exists is_demo boolean default false;
alter table if exists voucher_products add column if not exists is_demo boolean default false;
alter table if exists referral_campaigns add column if not exists is_demo boolean default false;
alter table if exists referral_events add column if not exists is_demo boolean default false;

insert into local_listings
(id, customer_id, platform, listing_url, status, nap_score, notes, is_demo)
values
('demo_listing_google_cafe','demo_customer_cafe_kuestenblick','Google Business Profile','https://maps.google.com/?q=demo+cafe+kuestenblick','Korrekt',92,'Name, Adresse und Öffnungszeiten konsistent.',true),
('demo_listing_apple_cafe','demo_customer_cafe_kuestenblick','Apple Maps','','Zu pruefen',61,'Apple Maps Eintrag sollte manuell geprüft werden.',true),
('demo_listing_bing_salon','demo_customer_friseur_hansekamm','Bing Places','','Fehlerhaft',54,'Telefonnummer weicht vom Google-Profil ab.',true)
on conflict (id) do update set
  status = excluded.status,
  nap_score = excluded.nap_score,
  notes = excluded.notes,
  is_demo = true,
  updated_at = now();

insert into booking_slots
(id, customer_id, title, service_name, starts_at, ends_at, capacity, status, is_demo)
values
('demo_slot_salon_001','demo_customer_friseur_hansekamm','Last-Minute Slot Freitag','Haarschnitt Damen','2026-06-05T13:00:00Z','2026-06-05T14:00:00Z',1,'Frei',true),
('demo_slot_cafe_001','demo_customer_cafe_kuestenblick','Tisch frei - Brunch','Reservierung','2026-06-07T09:00:00Z','2026-06-07T11:00:00Z',4,'Frei',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();

insert into booking_waitlist
(id, customer_id, client_name, request, preferred_at, phone, status, is_demo)
values
('demo_waitlist_salon_001','demo_customer_friseur_hansekamm','Lisa Warteliste','Balayage Termin diese Woche','2026-06-04T15:00:00Z','0176 000000','Wartet',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();

insert into rebooking_reminders
(id, customer_id, client_name, last_appointment_at, due_at, channel, status, is_demo)
values
('demo_rebooking_001','demo_customer_friseur_hansekamm','Max Demo','2026-04-15T10:00:00Z','2026-06-01T10:00:00Z','E-Mail','Offen',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();

insert into unified_messages
(id, customer_id, channel, subject, body, status, assigned_to, is_demo)
values
('demo_message_001','demo_customer_cafe_kuestenblick','Slug','Reservierung für Samstag','Habt ihr am Samstag noch einen Tisch fuer 4 Personen?','Neu','DominiqueMM',true),
('demo_message_002','demo_customer_friseur_hansekamm','Google','Frage zu Balayage','Kann ich online einen Beratungstermin buchen?','In Bearbeitung','JanneMM',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();

insert into payment_links
(id, customer_id, invoice_id, title, amount, provider, due_at, status, payment_url, is_demo)
values
('pay_demo_kuestenblick_001','demo_customer_cafe_kuestenblick','demo_invoice_001','Anzahlung Catering-Anfrage',50,'extern','2026-06-12','Offen','/pay/pay_demo_kuestenblick_001',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();

insert into voucher_products
(id, customer_id, title, amount, validity_days, status, is_demo)
values
('demo_voucher_cafe_001','demo_customer_cafe_kuestenblick','25 EUR Frühstücksgutschein',25,365,'Aktiv',true),
('demo_voucher_salon_001','demo_customer_friseur_hansekamm','50 EUR Friseurgutschein',50,365,'Aktiv',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();

insert into referral_campaigns
(id, customer_id, name, reward, referral_code, public_url, status, is_demo)
values
('demo_referral_salon_001','demo_customer_friseur_hansekamm','Freunde werben Freunde','10 EUR Rabatt für beide','DEMO-HANSE','/r/DEMO-HANSE','Aktiv',true)
on conflict (id) do update set
  status = excluded.status,
  public_url = excluded.public_url,
  is_demo = true,
  updated_at = now();

insert into referral_events
(id, campaign_id, customer_id, referral_code, referrer_name, referred_name, referred_contact, status, is_demo)
values
('demo_ref_event_001','demo_referral_salon_001','demo_customer_friseur_hansekamm','DEMO-HANSE','Max Demo','Sophie Beispiel','sophie@example.com','Neu',true)
on conflict (id) do update set
  status = excluded.status,
  is_demo = true,
  updated_at = now();
