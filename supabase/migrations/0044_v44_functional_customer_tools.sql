-- MMOS V44 Functional Customer Tool Modules
-- Echte Modul-Tabellen fuer Listings, Termin-Auslastung, Inbox, Zahlungen/Gutscheine und Empfehlungen.
-- Bestehende Tabellen wie customers, appointments, tickets, review_feedback, qr_campaigns, loyalty_rewards,
-- invoices und seo_snapshots bleiben erhalten und werden nur gelesen/verknuepft.

create table if not exists local_listings (
  id text primary key,
  customer_id text,
  platform text not null,
  listing_url text,
  status text default 'Zu pruefen',
  nap_score numeric default 80,
  notes text,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists booking_slots (
  id text primary key,
  customer_id text,
  title text not null,
  service_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer default 1,
  status text default 'Frei',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists booking_waitlist (
  id text primary key,
  customer_id text,
  client_name text,
  request text,
  preferred_at timestamptz,
  phone text,
  status text default 'Wartet',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rebooking_reminders (
  id text primary key,
  customer_id text,
  client_name text,
  last_appointment_at timestamptz,
  due_at timestamptz,
  channel text default 'E-Mail',
  status text default 'Offen',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists unified_messages (
  id text primary key,
  customer_id text,
  source_table text,
  source_id text,
  channel text default 'Manuell',
  subject text,
  body text,
  status text default 'Neu',
  assigned_to text,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payment_links (
  id text primary key,
  customer_id text,
  invoice_id text,
  title text,
  amount numeric default 0,
  provider text default 'extern',
  due_at date,
  status text default 'Offen',
  payment_url text,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists voucher_products (
  id text primary key,
  customer_id text,
  title text,
  amount numeric default 0,
  validity_days integer default 365,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists referral_campaigns (
  id text primary key,
  customer_id text,
  name text not null,
  reward text,
  referral_code text unique,
  public_url text,
  status text default 'Aktiv',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists referral_events (
  id text primary key,
  campaign_id text,
  customer_id text,
  referral_code text,
  referrer_name text,
  referred_name text,
  referred_contact text,
  status text default 'Neu',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_local_listings_customer_id on local_listings(customer_id);
create index if not exists idx_booking_slots_customer_id on booking_slots(customer_id);
create index if not exists idx_booking_waitlist_customer_id on booking_waitlist(customer_id);
create index if not exists idx_unified_messages_customer_id on unified_messages(customer_id);
create index if not exists idx_payment_links_customer_id on payment_links(customer_id);
create index if not exists idx_voucher_products_customer_id on voucher_products(customer_id);
create index if not exists idx_referral_campaigns_customer_id on referral_campaigns(customer_id);
create index if not exists idx_referral_events_campaign_id on referral_events(campaign_id);
