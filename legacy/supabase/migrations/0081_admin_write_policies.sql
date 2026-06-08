-- Fix fuer "Buttons speichern nicht" im Monolith page.tsx.
--
-- Root Cause: page.tsx useStore.update/create/remove ruft den Browser-
-- Anon-Supabase-Client direkt auf. Ohne RLS-Schreib-Policy fuer den
-- eingeloggten User schlagen alle Writes still fehl (Toast warnt, wird
-- aber oft uebersehen).
--
-- Diese Migration ergaenzt Schreib-Policies fuer Admin-User auf den
-- haeufigsten Settings-Tabellen. Admin = mmos_is_admin() aus
-- SQL_V42_24_SECURITY_PRIVACY_CENTER.sql (role IN admin|super_admin
-- mit status=active in user_profiles).
--
-- Idempotent. Bei Tabellen die in der Ziel-Umgebung nicht existieren
-- wird der CREATE POLICY-Block via to_regclass-Check uebersprungen.

do $$
declare
  t text;
  tables text[] := array[
    'landing_page_settings',
    'integrations',
    'customer_service_categories',
    'customer_seo_metrics',
    'workflow_rules',
    'automations',
    'loyalty_security_settings',
    'qr_campaigns',
    'loyalty_programs',
    'loyalty_rewards',
    'loyalty_reward_rules',
    'staff_codes',
    'customer_notes',
    'customer_files',
    'review_funnel_stats',
    'public_landing_pages',
    'monthly_reports',
    'onboarding_checklists',
    'acquisition_campaigns',
    'prospect_leads',
    'generated_offers',
    'generated_contracts',
    'mini_audits',
    'google_business_audits',
    'competitor_benchmarks',
    'dunning_cases',
    'customer_health_scores',
    'approval_requests',
    'knowledge_articles',
    'output_documents'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is not null then
      -- RLS einschalten (idempotent).
      execute format('alter table public.%I enable row level security', t);

      -- Admin-Write-Policy: erlaubt alle Operationen fuer Admins.
      if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = t and policyname = 'mmos_admin_write'
      ) then
        begin
          execute format(
            'create policy mmos_admin_write on public.%I for all to authenticated using (coalesce(public.mmos_is_admin(), false)) with check (coalesce(public.mmos_is_admin(), false))',
            t
          );
        exception when others then
          raise notice 'mmos_admin_write on %: %', t, sqlerrm;
        end;
      end if;

      -- Public-Read fuer landing_page_settings + public_landing_pages
      -- (oeffentliche Anzeigen brauchen anon-Zugriff).
      if t in ('landing_page_settings', 'public_landing_pages', 'knowledge_articles') then
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public' and tablename = t and policyname = 'mmos_public_read'
        ) then
          begin
            execute format(
              'create policy mmos_public_read on public.%I for select to anon, authenticated using (true)',
              t
            );
          exception when others then
            raise notice 'mmos_public_read on %: %', t, sqlerrm;
          end;
        end if;
      end if;
    else
      raise notice 'table %.% does not exist, skipping policies', 'public', t;
    end if;
  end loop;
end $$;
