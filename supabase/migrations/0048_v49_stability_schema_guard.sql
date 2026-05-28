
-- MMOS V49 Stability & Production Guard
-- Idempotente Schutzmigration fuer V43-V47 Tabellen, Demo/Live-Trennung,
-- Error-Logs und stabile Customer-Indizes.

create table if not exists app_error_logs (
  id text primary key default gen_random_uuid()::text,
  context text,
  message text,
  meta jsonb default '{}'::jsonb,
  is_demo boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_app_error_logs_created_at on app_error_logs(created_at desc);
create index if not exists idx_app_error_logs_context on app_error_logs(context);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'customers',
    'appointments',
    'tickets',
    'review_feedback',
    'prospect_leads',
    'qr_campaigns',
    'loyalty_rewards',
    'loyalty_customers',
    'loyalty_transactions',
    'invoices',
    'seo_snapshots',
    'integrations',
    'competitor_benchmarks',
    'local_listings',
    'booking_slots',
    'booking_waitlist',
    'rebooking_reminders',
    'unified_messages',
    'payment_links',
    'voucher_products',
    'referral_campaigns',
    'referral_events',
    'v46_value_reports',
    'v47_heatmap_points',
    'v47_slug_hub_settings',
    'v47_review_goals',
    'v47_loyalty_goals',
    'v47_lead_audits',
    'v47_value_offers',
    'v47_tool_access_rules',
    'v47_customer_health_events',
    'v47_automation_playbooks',
    'v47_media_report_links'
  ]
  loop
    if to_regclass(tbl) is not null then
      execute format('alter table %I add column if not exists is_demo boolean default false', tbl);
      execute format('alter table %I add column if not exists created_at timestamptz default now()', tbl);
      execute format('alter table %I add column if not exists updated_at timestamptz default now()', tbl);

      if exists (
        select 1
        from information_schema.columns
        where table_name = tbl
          and column_name = 'customer_id'
      ) then
        execute format('create index if not exists %I on %I(customer_id)', 'idx_' || tbl || '_customer_id', tbl);
      end if;

      execute format('create index if not exists %I on %I(is_demo)', 'idx_' || tbl || '_is_demo', tbl);
    end if;
  end loop;
end $$;

create table if not exists v49_stability_checks (
  id text primary key,
  check_key text,
  status text,
  details jsonb default '{}'::jsonb,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into v49_stability_checks (id, check_key, status, details, is_demo)
values (
  'v49_stability_guard_installed',
  'schema_guard',
  'ok',
  '{"description":"V49 Stability Schema Guard wurde ausgefuehrt."}'::jsonb,
  false
)
on conflict (id) do update set
  status = excluded.status,
  details = excluded.details,
  updated_at = now();
