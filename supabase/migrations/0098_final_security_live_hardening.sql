-- MMOS Final Security / Live Hardening
-- Tenant-Isolation helpers, strict audit RPC, policy compatibility, package/tool access checks.

create extension if not exists pgcrypto;

-- Helper: current profile role from user_profiles.
create or replace function public.mmos_current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select lower(coalesce((
    select role from public.user_profiles
    where id::text = auth.uid()::text
       or lower(coalesce(email,'')) = lower(coalesce(auth.jwt()->>'email',''))
    order by updated_at desc nulls last
    limit 1
  ), ''));
$$;

create or replace function public.mmos_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.mmos_current_role() in ('admin','super_admin'), false);
$$;

create or replace function public.mmos_current_customer_id()
returns text
language sql
security definer
set search_path = public
as $$
  select (
    select customer_id::text from public.user_profiles
    where id::text = auth.uid()::text
       or lower(coalesce(email,'')) = lower(coalesce(auth.jwt()->>'email',''))
    order by updated_at desc nulls last
    limit 1
  );
$$;

create or replace function public.mmos_can_access_customer(p_customer_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.mmos_is_admin(), false)
    or exists (
      select 1 from public.customer_users cu
      where cu.auth_user_id::text = auth.uid()::text
        and cu.customer_id::text = p_customer_id::text
        and lower(coalesce(cu.status,'')) = 'active'
    )
    or public.mmos_current_customer_id()::text = p_customer_id::text;
$$;

-- Column listing RPC used by fallback probes.
create or replace function public.mmos_table_columns(p_table text)
returns table(column_name text)
language sql
security definer
set search_path = public, information_schema
as $$
  select c.column_name::text
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = p_table
  order by c.ordinal_position;
$$;

-- Tenant security audit: reports RLS, policies, and possibly broad authenticated policies.
create or replace function public.mmos_tenant_security_audit()
returns table (
  table_name text,
  exists_table boolean,
  rls_enabled boolean,
  force_rls boolean,
  has_customer_id boolean,
  policy_count integer,
  broad_authenticated_policy_count integer,
  status text
)
language sql
security definer
set search_path = public
as $$
  with expected(table_name) as (
    values
      ('customers'),
      ('customer_users'),
      ('user_profiles'),
      ('invoices'),
      ('customer_files'),
      ('output_documents'),
      ('tickets'),
      ('ticket_messages'),
      ('monthly_reports'),
      ('approval_requests'),
      ('dsar_requests'),
      ('customer_tool_access'),
      ('qr_campaigns'),
      ('review_feedback'),
      ('seo_snapshots'),
      ('integrations')
  ),
  tbl as (
    select e.table_name, c.oid, c.relrowsecurity, c.relforcerowsecurity
    from expected e
    left join pg_class c on c.relname = e.table_name and c.relnamespace = 'public'::regnamespace
  ),
  pol as (
    select schemaname, tablename, count(*)::int as policy_count,
      count(*) filter (
        where lower(coalesce(qual,'')) like '%auth.role()%authenticated%'
           or lower(coalesce(with_check,'')) like '%auth.role()%authenticated%'
           or lower(policyname) like '%authenticated%'
      )::int as broad_count
    from pg_policies
    where schemaname='public'
    group by schemaname, tablename
  ),
  cols as (
    select table_name, bool_or(column_name='customer_id') as has_customer_id
    from information_schema.columns
    where table_schema='public'
    group by table_name
  )
  select
    t.table_name,
    t.oid is not null as exists_table,
    coalesce(t.relrowsecurity,false) as rls_enabled,
    coalesce(t.relforcerowsecurity,false) as force_rls,
    coalesce(cols.has_customer_id,false) as has_customer_id,
    coalesce(pol.policy_count,0) as policy_count,
    coalesce(pol.broad_count,0) as broad_authenticated_policy_count,
    case
      when t.oid is null then 'TABLE_MISSING'
      when coalesce(t.relrowsecurity,false)=false then 'RLS_OFF'
      when coalesce(pol.policy_count,0)=0 then 'NO_POLICY'
      when coalesce(pol.broad_count,0)>0 then 'WARN_BROAD_AUTHENTICATED_POLICY'
      else 'OK'
    end as status
  from tbl t
  left join pol on pol.tablename = t.table_name
  left join cols on cols.table_name = t.table_name
  order by t.table_name;
$$;

-- Enable RLS on core tables without destructive policy drops.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','customer_users','user_profiles','invoices','customer_files','output_documents','tickets','ticket_messages',
    'monthly_reports','approval_requests','dsar_requests','customer_tool_access','qr_campaigns','review_feedback','seo_snapshots','integrations'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Add customer-scoped policies where customer_id exists. Existing broad policies are reported by audit RPC and should be removed once migration is verified.
do $$
declare
  t text;
  has_customer_id boolean;
  policy_name text;
begin
  foreach t in array array[
    'invoices','customer_files','output_documents','tickets','ticket_messages','monthly_reports','approval_requests',
    'dsar_requests','customer_tool_access','qr_campaigns','review_feedback','seo_snapshots','integrations'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      select exists (
        select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='customer_id'
      ) into has_customer_id;
      if has_customer_id then
        policy_name := 'mmos_tenant_customer_access_' || t;
        if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=policy_name) then
          execute format(
            'create policy %I on public.%I for all to authenticated using (public.mmos_can_access_customer(customer_id::text)) with check (public.mmos_can_access_customer(customer_id::text))',
            policy_name, t
          );
        end if;
      end if;
    end if;
  end loop;
end $$;

-- Tables without customer_id need special admin/customer policies.
do $$
begin
  if to_regclass('public.customers') is not null and not exists (select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='mmos_customers_admin_or_member') then
    create policy mmos_customers_admin_or_member on public.customers
      for all to authenticated
      using (public.mmos_is_admin() or public.mmos_can_access_customer(id::text))
      with check (public.mmos_is_admin() or public.mmos_can_access_customer(id::text));
  end if;

  if to_regclass('public.customer_users') is not null and not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_users' and policyname='mmos_customer_users_admin_or_self') then
    create policy mmos_customer_users_admin_or_self on public.customer_users
      for all to authenticated
      using (public.mmos_is_admin() or auth_user_id::text = auth.uid()::text or public.mmos_can_access_customer(customer_id::text))
      with check (public.mmos_is_admin() or auth_user_id::text = auth.uid()::text or public.mmos_can_access_customer(customer_id::text));
  end if;

  if to_regclass('public.user_profiles') is not null and not exists (select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='mmos_user_profiles_admin_or_self') then
    create policy mmos_user_profiles_admin_or_self on public.user_profiles
      for all to authenticated
      using (public.mmos_is_admin() or id::text = auth.uid()::text or public.mmos_can_access_customer(customer_id::text))
      with check (public.mmos_is_admin() or id::text = auth.uid()::text or public.mmos_can_access_customer(customer_id::text));
  end if;
end $$;

-- Final acceptance logs.
create table if not exists public.production_acceptance_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id text,
  status text not null default 'created',
  checks jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.production_acceptance_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='production_acceptance_runs' and policyname='mmos_admin_acceptance_runs') then
    create policy mmos_admin_acceptance_runs on public.production_acceptance_runs
      for all to authenticated using (public.mmos_is_admin()) with check (public.mmos_is_admin());
  end if;
end $$;
