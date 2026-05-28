-- V42.24.4 TYPE-SAFE LIVE/DEMO SPLIT - NICHT-DESTRUKTIV
-- Fix: customer_id/id Vergleiche sind typensicher via ::text, damit text/uuid-Mischungen nicht abbrechen.
-- Ziel: Demo-Daten behalten, aber vom Live-System trennen.
-- Wichtig: Dieses Script löscht KEINE Demo-Datensätze und leert KEINE demo_* Tabellen.
-- Demo bleibt erhalten, Live-Ansichten filtern is_demo=true bzw. demo_* aus.

create extension if not exists pgcrypto;

alter table if exists public.customers add column if not exists is_demo boolean not null default false;
alter table if exists public.invoices add column if not exists is_demo boolean not null default false;

-- Isolierte Demo-Tabellen bleiben bewusst erhalten.
-- Falls ältere Builds Demo-Tabellen verwenden, werden sie nicht geleert.

-- Demo-ähnliche Kunden nur markieren, nicht löschen. Spalten werden defensiv geprüft.
do $$
declare
  where_sql text := '';
  has_name boolean;
  has_email boolean;
begin
  if to_regclass('public.customers') is not null then
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='customers' and column_name='name') into has_name;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='customers' and column_name='email') into has_email;

    where_sql := 'coalesce(is_demo,false) = true';
    if has_name then
      where_sql := where_sql || ' or coalesce(name,'''') ilike ''DEMO %'' or coalesce(name,'''') ilike ''%Demo Kunde%''';
    end if;
    if has_email then
      where_sql := where_sql || ' or coalesce(email,'''') ilike ''%@mmos.local'' or coalesce(email,'''') ilike ''%demo%''';
    end if;

    execute 'update public.customers set is_demo = true where ' || where_sql;
  end if;
end $$;

-- Rechnungen mit Demo-Merkmal nur markieren, nicht löschen.
do $$
declare
  where_sql text := 'coalesce(is_demo,false) = true';
  has_invoice_number boolean;
  has_pdf_url boolean;
  has_customer_id boolean;
begin
  if to_regclass('public.invoices') is not null then
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='invoice_number') into has_invoice_number;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='pdf_url') into has_pdf_url;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='customer_id') into has_customer_id;

    if has_invoice_number then
      where_sql := where_sql || ' or coalesce(invoice_number,'''') ilike ''%DEMO%''';
    end if;
    if has_pdf_url then
      where_sql := where_sql || ' or coalesce(pdf_url,'''') ilike ''%demo-files%''';
    end if;
    if has_customer_id then
      where_sql := where_sql || ' or customer_id::text in (select id::text from public.customers where coalesce(is_demo,false) = true)';
    end if;

    execute 'update public.invoices set is_demo = true where ' || where_sql;
  end if;
end $$;

-- Kundengebundene Tabellen bekommen is_demo, soweit sie im Live-System auftauchen können.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customer_subscriptions','customer_tool_access','package_requests','invoices','tickets','ticket_messages',
    'appointments','customer_clients','offers','workflow_runs','activity_logs','customer_notes','integrations',
    'seo_snapshots','customer_files','notifications','customer_service_categories','customer_seo_metrics',
    'review_funnel_stats','client_success_events','qr_campaigns','review_feedback','competitor_benchmarks',
    'google_business_audits','mini_audits','generated_offers','generated_contracts','dunning_cases',
    'customer_health_scores','acquisition_campaigns','onboarding_checklists','monthly_reports','approval_requests',
    'output_documents','customer_registrations','customer_invites','customer_users','public_landing_pages',
    'loyalty_programs','loyalty_rewards','loyalty_reward_rules','staff_codes','loyalty_customers',
    'loyalty_transactions','loyalty_reward_redemptions','loyalty_member_security_scores','security_events','dsar_requests',
    'v33_public_leads','v33_functional_records','v35_engine_runs','v37_loyalty_settings'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists is_demo boolean not null default false', t);
    end if;
  end loop;
end $$;

-- Direkte Demo-Bezüge markieren, ohne Datensätze zu entfernen.
do $$
declare
  t text;
  has_customer_id boolean;
begin
  foreach t in array array[
    'customer_subscriptions','customer_tool_access','package_requests','invoices','tickets','ticket_messages',
    'appointments','customer_clients','offers','workflow_runs','activity_logs','customer_notes','integrations',
    'seo_snapshots','customer_files','notifications','customer_service_categories','customer_seo_metrics',
    'review_funnel_stats','client_success_events','qr_campaigns','review_feedback','competitor_benchmarks',
    'google_business_audits','mini_audits','generated_offers','generated_contracts','dunning_cases',
    'customer_health_scores','acquisition_campaigns','onboarding_checklists','monthly_reports','approval_requests',
    'output_documents','customer_registrations','customer_invites','customer_users','public_landing_pages',
    'loyalty_programs','loyalty_rewards','loyalty_reward_rules','staff_codes','loyalty_customers',
    'loyalty_transactions','loyalty_reward_redemptions','loyalty_member_security_scores','security_events','dsar_requests',
    'v33_public_leads','v33_functional_records','v35_engine_runs','v37_loyalty_settings'
  ] loop
    if to_regclass('public.' || t) is not null then
      select exists(
        select 1 from information_schema.columns
        where table_schema='public' and table_name=t and column_name='customer_id'
      ) into has_customer_id;
      if has_customer_id then
        execute format('update public.%I set is_demo = true where customer_id::text in (select id::text from public.customers where coalesce(is_demo,false) = true)', t);
      end if;
    end if;
  end loop;
end $$;

-- Indirekte Demo-Bezüge markieren.
do $$
begin
  if to_regclass('public.ticket_messages') is not null and to_regclass('public.tickets') is not null then
    update public.ticket_messages tm
    set is_demo = true
    from public.tickets t
    where tm.ticket_id::text = t.id::text and coalesce(t.is_demo,false) = true;
  end if;

  if to_regclass('public.dunning_cases') is not null and to_regclass('public.invoices') is not null then
    update public.dunning_cases dc
    set is_demo = true
    from public.invoices i
    where dc.invoice_id::text = i.id::text and coalesce(i.is_demo,false) = true;
  end if;

  if to_regclass('public.mini_audits') is not null and to_regclass('public.google_business_audits') is not null then
    update public.mini_audits ma
    set is_demo = true
    from public.google_business_audits a
    where ma.audit_id::text = a.id::text and coalesce(a.is_demo,false) = true;
  end if;
end $$;

-- Öffentliche Live-Startseite: kein öffentlicher Demo-Button. Die interne Demo bleibt über ENABLE_DEMO_MODE/NEXT_PUBLIC_ENABLE_DEMO_MODE erreichbar.
do $$
declare
  has_scope boolean;
  has_updated_at boolean;
  has_show_demo_button boolean;
  has_secondary_cta_label boolean;
begin
  if to_regclass('public.landing_page_settings') is not null then
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='landing_page_settings' and column_name='scope') into has_scope;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='landing_page_settings' and column_name='updated_at') into has_updated_at;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='landing_page_settings' and column_name='show_public_demo_button') into has_show_demo_button;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='landing_page_settings' and column_name='secondary_cta_label') into has_secondary_cta_label;

    if not has_show_demo_button then
      return;
    end if;
    if not has_secondary_cta_label then
      alter table public.landing_page_settings add column if not exists secondary_cta_label text;
      has_secondary_cta_label := true;
    end if;

    if has_updated_at then
      if has_scope then
        update public.landing_page_settings
        set show_public_demo_button = false,
            secondary_cta_label = coalesce(nullif(secondary_cta_label,''), 'Portal öffnen'),
            updated_at = now()
        where id = 'main' or scope = 'public_home';
      else
        update public.landing_page_settings
        set show_public_demo_button = false,
            secondary_cta_label = coalesce(nullif(secondary_cta_label,''), 'Portal öffnen'),
            updated_at = now()
        where id = 'main';
      end if;
    else
      if has_scope then
        update public.landing_page_settings
        set show_public_demo_button = false,
            secondary_cta_label = coalesce(nullif(secondary_cta_label,''), 'Portal öffnen')
        where id = 'main' or scope = 'public_home';
      else
        update public.landing_page_settings
        set show_public_demo_button = false,
            secondary_cta_label = coalesce(nullif(secondary_cta_label,''), 'Portal öffnen')
        where id = 'main';
      end if;
    end if;
  end if;
end $$;

create table if not exists public.schema_migrations_mmos (
  version text primary key,
  file text,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations_mmos add column if not exists file text;
alter table public.schema_migrations_mmos add column if not exists file_name text;
alter table public.schema_migrations_mmos add column if not exists description text;

insert into public.schema_migrations_mmos(version, file, file_name, description, applied_at)
values (
  'V42.24.3_LIVE_DEMO_SPLIT_NON_DESTRUCTIVE',
  'SQL_V42_24_3_LIVE_DEMO_SPLIT_NON_DESTRUCTIVE.sql',
  'SQL_V42_24_3_LIVE_DEMO_SPLIT_NON_DESTRUCTIVE.sql',
  'Demo data is preserved and marked/isolated; live mode filters demo records instead of deleting them.',
  now()
)
on conflict (version) do update set
  file = excluded.file,
  file_name = excluded.file_name,
  description = excluded.description,
  applied_at = excluded.applied_at;
