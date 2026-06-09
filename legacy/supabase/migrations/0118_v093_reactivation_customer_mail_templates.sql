-- MMOS V093: Kundenspezifische Rückholmail-Vorlagen
-- Ergänzt das Rückholtool um frei anpassbare E-Mail-/Reminder-Texte mit Platzhaltern.
-- Pflichtfooter, Double-Opt-in-Hinweis und Abmeldelink bleiben systemseitig fest.

create extension if not exists "pgcrypto";

do $$
begin
  if to_regclass('public.customer_reactivation_settings') is not null then
    alter table public.customer_reactivation_settings
      add column if not exists email_body_template text,
      add column if not exists email_button_label text not null default 'Rückhol-Prämie öffnen',
      add column if not exists email_signature text,
      add column if not exists reminder_body_template text,
      add column if not exists reminder_button_label text not null default 'Prämie jetzt öffnen';

    update public.customer_reactivation_settings
       set email_body_template = coalesce(
             nullif(email_body_template, ''),
             nullif(email_intro, ''),
             'Hallo {vorname},

wir haben dich bei {betrieb} vermisst. Als kleines Dankeschön wartet diese persönliche Rückhol-Prämie auf dich:

{praemie}

Öffne deinen persönlichen Einmal-Link:
{rueckhol_link}

Gültig bis: {gueltig_bis}
{einloese_hinweis}'
           ),
           reminder_body_template = coalesce(
             nullif(reminder_body_template, ''),
             nullif(reminder_intro, ''),
             'Hallo {vorname},

deine persönliche Rückhol-Prämie bei {betrieb} wartet noch auf dich:

{praemie}

Hier kannst du sie öffnen:
{rueckhol_link}

{einloese_hinweis}'
           ),
           email_signature = coalesce(nullif(email_signature, ''), 'Liebe Grüße
{betrieb}'),
           metadata = coalesce(metadata, '{}'::jsonb)
             || jsonb_build_object(
                  'template_version', 'v093_customer_editable_reactivation_mail',
                  'template_scope', 'customer_or_qr_campaign',
                  'editable_fields', jsonb_build_array('email_subject','email_body_template','email_button_label','email_signature','reminder_subject','reminder_body_template','reminder_button_label'),
                  'fixed_legal_footer', true,
                  'allowed_placeholders', jsonb_build_array('{vorname}','{name}','{betrieb}','{praemie}','{punkte}','{punkte_text}','{gueltig_bis}','{rueckhol_link}','{einloese_hinweis}')
                ),
           updated_at = coalesce(updated_at, now())
     where email_body_template is null
        or email_body_template = ''
        or reminder_body_template is null
        or reminder_body_template = ''
        or email_signature is null
        or email_signature = '';
  end if;
end $$;
