-- Mandanten-RLS fuer die v44/v46/v47-Tool-Tabellen.
--
-- Problem: Diese Tabellen (Migrationen 0044/0046/0047) wurden OHNE RLS und
-- ohne Policies angelegt. Die zugehoerigen Tools lesen/schreiben direkt ueber
-- den Browser-Supabase-Client. Ohne RLS sind sie damit fuer jeden
-- eingeloggten Nutzer ueber alle Kunden hinweg sichtbar/aenderbar
-- (fehlende Mandanten-Isolation, DSGVO-/Sicherheitsrisiko).
--
-- Fix: pro Tabelle mit customer_id eine mandantenscharfe Policy:
--   - Admin (mmos_is_admin) sieht/aendert alles
--   - Customer sieht/aendert nur eigene Zeilen (customer_id = mmos_current_customer_id())
-- Das Backend nutzt den Service-Role-Key und umgeht RLS weiterhin vollstaendig.
--
-- Sicherheits-Design:
--   * Policy wird VOR enable RLS erstellt; schlaegt das fehl, bleibt RLS aus
--     (Tabelle nicht versehentlich gesperrt).
--   * Nur Tabellen OHNE bestehende Policy werden angefasst (idempotent, kollidiert
--     nicht mit bereits gemanagten Tabellen).
--   * customer_id wird beidseitig nach text gecastet (Tabellen nutzen text,
--     mmos_current_customer_id() liefert uuid).

do $$
declare
  t text;
  targets text[] := array[
    -- v46
    'v46_value_reports',
    -- v47
    'v47_heatmap_points','v47_slug_hub_settings','v47_review_goals','v47_loyalty_goals',
    'v47_lead_audits','v47_value_offers','v47_tool_access_rules','v47_customer_health_events',
    'v47_automation_playbooks','v47_media_report_links',
    -- v44 (generische Namen)
    'local_listings','booking_slots','booking_waitlist','rebooking_reminders',
    'unified_messages','payment_links','voucher_products','referral_campaigns','referral_events'
  ];
begin
  if not exists (select 1 from pg_proc where proname = 'mmos_current_customer_id')
     or not exists (select 1 from pg_proc where proname = 'mmos_is_admin') then
    raise notice '0085 uebersprungen: mmos_current_customer_id()/mmos_is_admin() nicht vorhanden';
    return;
  end if;

  foreach t in array targets loop
    if exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = t)
       and exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = t and column_name = 'customer_id')
       and not exists (select 1 from pg_policies
                         where schemaname = 'public' and tablename = t) then
      begin
        execute format(
          'create policy mmos_tenant_rw on public.%I for all to authenticated '
          || 'using (coalesce(public.mmos_is_admin(), false) '
          || 'or customer_id::text = (public.mmos_current_customer_id())::text) '
          || 'with check (coalesce(public.mmos_is_admin(), false) '
          || 'or customer_id::text = (public.mmos_current_customer_id())::text)',
          t
        );
        execute format('alter table public.%I enable row level security', t);
        raise notice '0085: RLS + Mandanten-Policy gesetzt auf %', t;
      exception when others then
        raise notice '0085: uebersprungen auf %: %', t, sqlerrm;
      end;
    end if;
  end loop;
end $$;
