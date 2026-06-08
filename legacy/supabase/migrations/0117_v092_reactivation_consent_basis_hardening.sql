-- MMOS V092: Consent-Hardening für Rückholaktionen
-- Rückholmails basieren ausschließlich auf der separaten Slug-Double-Opt-in-Einwilligung
-- für Werbe-, Prämien- und persönliche Reaktivierungsmails.

create extension if not exists "pgcrypto";

do $$
begin
  if to_regclass('public.customer_reactivation_settings') is not null then
    alter table public.customer_reactivation_settings
      add column if not exists require_marketing_consent boolean not null default true;

    update public.customer_reactivation_settings
       set require_marketing_consent = true,
           metadata = coalesce(metadata, '{}'::jsonb)
             || jsonb_build_object(
                  'consent_basis', 'slug_double_opt_in_reactivation',
                  'consent_required', true,
                  'consent_version', 'marketing-reactivation-v2-2026-06-03',
                  'consent_source', 'public_slug_page',
                  'consent_purposes', jsonb_build_array('loyalty_reminders','reward_reminders','coupon_offers','reactivation')
                ),
           updated_at = coalesce(updated_at, now());

    alter table public.customer_reactivation_settings
      alter column require_marketing_consent set default true;

    if not exists (
      select 1 from pg_constraint
      where conname = 'customer_reactivation_settings_require_consent_chk'
        and conrelid = 'public.customer_reactivation_settings'::regclass
    ) then
      alter table public.customer_reactivation_settings
        add constraint customer_reactivation_settings_require_consent_chk
        check (require_marketing_consent is true);
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.customer_reactivation_links') is not null then
    alter table public.customer_reactivation_links
      add column if not exists consent_basis text,
      add column if not exists consent_checked_at timestamptz;

    update public.customer_reactivation_links
       set consent_basis = coalesce(consent_basis, 'slug_double_opt_in_reactivation'),
           metadata = coalesce(metadata, '{}'::jsonb)
             || jsonb_build_object(
                  'consent_basis', 'slug_double_opt_in_reactivation',
                  'reactivation_mail_requires_double_opt_in', true
                )
     where consent_basis is null
        or consent_basis = '';
  end if;
end $$;
