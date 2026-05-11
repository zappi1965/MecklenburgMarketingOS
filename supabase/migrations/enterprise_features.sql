-- Enterprise Features Migration

create table if not exists tenant_branding (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  company_name text,
  primary_color text default '#2563eb',
  secondary_color text default '#111827',
  logo_url text,
  custom_domain text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  customer_id uuid references customers(id),
  action text,
  entity text,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text,
  module_key text,
  can_view boolean default true,
  can_edit boolean default false,
  can_delete boolean default false
);

create table if not exists smart_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  title text,
  body text,
  type text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  customer_id uuid references customers(id),
  event_name text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists sales_pipeline (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  stage text,
  expected_revenue numeric(12,2),
  probability integer,
  notes text,
  created_at timestamptz default now()
);

create table if not exists whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  phone text,
  message text,
  status text default 'queued',
  created_at timestamptz default now()
);

create table if not exists billing_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_name text,
  monthly_price numeric(12,2),
  active boolean default true,
  created_at timestamptz default now()
);