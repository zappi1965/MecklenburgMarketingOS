-- MMOS V43 Customer Tool Modules Catalog
create table if not exists customer_tool_modules (
  key text primary key,
  title text not null,
  short_title text not null,
  category text not null,
  description text not null,
  customer_value text not null,
  included_tools jsonb default '[]'::jsonb,
  single_price numeric not null default 0,
  setup_fee numeric not null default 0,
  package_min text not null default 'starter',
  recommended_for jsonb default '[]'::jsonb,
  source_inspiration jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists customer_package_modules (
  package_key text not null,
  module_key text not null references customer_tool_modules(key) on delete cascade,
  sort_order integer default 100,
  included boolean default true,
  primary key (package_key, module_key)
);

create table if not exists tool_module_links (
  id text primary key,
  module_key text not null references customer_tool_modules(key) on delete cascade,
  tool_key text not null,
  route text,
  label text,
  created_at timestamptz default now()
);
