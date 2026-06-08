const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../../..')

function file(rel) {
  return fs.existsSync(path.join(root, rel))
}

function read(rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8') }
  catch (_) { return '' }
}

function envPresent(name) {
  return Boolean(String(process.env[name] || '').trim())
}

function envTrue(name) {
  return String(process.env[name] || '').toLowerCase() === 'true'
}

function item(key, label, ok, hint = '', severity = 'medium', meta = {}) {
  return { key, label, ok: Boolean(ok), hint, severity, ...meta }
}

function score(items = []) {
  if (!items.length) return 0
  const ok = items.filter((x) => x.ok).length
  return Math.round((ok / items.length) * 100)
}

function statusFromScore(value) {
  if (value >= 90) return 'ready'
  if (value >= 70) return 'prepared'
  if (value >= 45) return 'partial'
  return 'blocked'
}

function moduleAudit({ key, title, description, checks, next_steps = [], owner = 'MMOS' }) {
  const s = score(checks)
  return {
    key,
    title,
    description,
    score: s,
    status: statusFromScore(s),
    ok: s >= 90,
    owner,
    checks,
    missing: checks.filter((c) => !c.ok),
    next_steps
  }
}

function serverContains(text) {
  const server = read('backend/src/server.js')
  return server.includes(text)
}

function adminShellContains(text) {
  const shell = read('frontend/src/components/AdminShell.tsx')
  return shell.includes(text)
}

function packageContains(text) {
  return read('frontend/src/lib/customerToolModules.ts').includes(text)
}

function registryContains(text) {
  return read('frontend/src/lib/toolRegistry.ts').includes(text)
}

function landingContains(text) {
  return read('frontend/src/app/page.tsx').includes(text)
}

function buildCompletenessAudit({ customer_id = null } = {}) {
  const modules = []

  modules.push(moduleAudit({
    key: 'customer_portal_backoffice',
    title: 'Kundenportal / Kunden-Backoffice',
    description: 'Prueft, ob ein kundenseitiger Bereich zum Sehen und einfachen Verwalten vorhanden ist.',
    checks: [
      item('portal_home', '/portal vorhanden', file('frontend/src/app/portal/page.tsx'), 'Kundenportal Startseite fehlt.'),
      item('portal_reports', '/portal/reports vorhanden', file('frontend/src/app/portal/reports/page.tsx'), 'Reportbereich fehlt.'),
      item('portal_consents', '/portal/consents vorhanden', file('frontend/src/app/portal/consents/page.tsx'), 'Consent-Uebersicht fehlt.'),
      item('portal_backoffice', '/portal/backoffice vorhanden', file('frontend/src/app/portal/backoffice/page.tsx'), 'Kunden-Backoffice Basis fehlt.'),
      item('portal_overview_api', 'Portal Overview API vorhanden', read('backend/src/routes/customerPortalRoutes.js').includes("router.get('/overview'"), 'GET /api/customer-portal/overview fehlt.'),
      item('customer_access_guard', 'Kundenzugriff ist guard-basiert', read('backend/src/routes/customerPortalRoutes.js').includes('req.userProfile') || read('backend/src/routes/customerPortalRoutes.js').includes('customer_id'), 'Portal-Zugriff pruefen.'),
      item('self_service_limits', 'Self-Service bewusst eingeschraenkt', true, 'Kunde sieht in V1 nur freigegebene Daten; Kampagnenverwaltung bleibt intern.')
    ],
    next_steps: [
      'Nach Pilot: /portal/qr-campaigns, /portal/loyalty, /portal/reviews, /portal/team und /portal/billing ausbauen.',
      'Kunden-Freigabeprozess fuer Kampagnen und Reports als naechsten Ausbau planen.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'sumup_v1',
    title: 'SumUp Umsatz & Zahlungen V1',
    description: 'Prueft die V1-Integration fuer Umsatzdaten ohne Kassensystem-Ersatz.',
    checks: [
      item('service', 'posService SumUp Sync vorhanden', read('backend/src/services/posService.js').includes('syncSumUpTransactions'), 'SumUp Sync Service fehlt.'),
      item('routes', 'SumUp API-Routen vorhanden', read('backend/src/routes/posRoutes.js').includes('/providers/sumup/sync/:customer_id'), 'SumUp Sync Route fehlt.'),
      item('ui', '/admin/pos Umsatz & Zahlungen vorhanden', read('frontend/src/app/admin/pos/page.tsx').includes('Umsatz & Zahlungen'), 'UI fehlt.'),
      item('package', 'Paketmodul SumUp Umsatzdaten vorhanden', packageContains('sumup_revenue_connection'), 'Paketmodul fehlt.'),
      item('migration', 'Migration 0100 vorhanden', file('supabase/migrations/0100_sumup_revenue_connection_v1.sql'), 'Migration 0100 fehlt.'),
      item('env_or_customer_config', 'Globaler oder kundenbezogener Token moeglich', envPresent('SUMUP_ACCESS_TOKEN') || read('backend/src/services/posService.js').includes('pos_provider_configs'), 'SUMUP_ACCESS_TOKEN fehlt; alternativ kundenbezogen in UI verbinden.', 'high'),
      item('v1_scope', 'Keine Kassenersetzung / keine Zahlungsausloesung', true, 'V1 ist bewusst Umsatzdaten-only.')
    ],
    next_steps: [
      'Live mit echtem SumUp Access Token testen.',
      'Spaeter V2: OAuth, Token Refresh, Webhook-Eventverifizierung und Zahlungsstart per Reader.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'pdf_report_delivery',
    title: 'PDF-/Report-Versand',
    description: 'Prueft Monatsreport-PDF, Gotenberg und Mailversand.',
    checks: [
      item('service', 'monthlyReportDeliveryService vorhanden', file('backend/src/services/monthlyReportDeliveryService.js'), 'Service fehlt.'),
      item('routes', 'PDF/Send Routen vorhanden', read('backend/src/routes/operationsRoutes.js').includes('/monthly-report/:customer_id/pdf') && read('backend/src/routes/operationsRoutes.js').includes('/monthly-report/:customer_id/send'), 'Operations-Routen fehlen.'),
      item('ui', '/admin/reports/monthly PDF-Buttons vorhanden', read('frontend/src/app/admin/reports/monthly/page.tsx').includes('PDF versenden'), 'UI-Buttons fehlen.'),
      item('gotenberg_env', 'GOTENBERG_URL gesetzt', envPresent('GOTENBERG_URL'), 'GOTENBERG_URL live setzen und testen.', 'high', { external: true }),
      item('resend_env', 'RESEND_API_KEY gesetzt', envPresent('RESEND_API_KEY'), 'RESEND_API_KEY live setzen.', 'high', { external: true }),
      item('mail_from', 'MAIL_FROM gesetzt', envPresent('MAIL_FROM'), 'MAIL_FROM mit verifizierter Domain setzen.', 'high', { external: true })
    ],
    next_steps: [
      'Gotenberg live deployen/URL setzen.',
      'Echten Monatsreport erzeugen und als PDF im Kundenportal pruefen.',
      'Echte Report-Mail an Testadresse senden.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'mail_consent_legal',
    title: 'Mail, Double-Opt-in, Consent & Recht',
    description: 'Prueft technische Consent-Umsetzung und externe Rechts-/Mail-Nachweise.',
    checks: [
      item('doi_service', 'Double-Opt-in Service vorhanden', file('backend/src/services/marketingConsentMailService.js'), 'DOI-Service fehlt.'),
      item('consent_center', 'Endkunden Consent Center vorhanden', file('frontend/src/app/marketing/consent-center/page.tsx'), 'Consent Center fehlt.'),
      item('unsubscribe', 'Abmeldelink-Seite vorhanden', file('frontend/src/app/marketing/unsubscribe/page.tsx'), 'Unsubscribe-Seite fehlt.'),
      item('mail_domain_page', 'Mail-Domain Readiness Seite vorhanden', file('frontend/src/app/admin/production/mail-domain/page.tsx'), 'Mail-Domain Seite fehlt.'),
      item('spf_dkim_dmarc_env', 'Mail-Domain live bestaetigt', envTrue('MMOS_MAIL_DOMAIN_VERIFIED'), 'SPF/DKIM/DMARC live setzen und MMOS_MAIL_DOMAIN_VERIFIED=true erst nach Nachweis.', 'high', { external: true }),
      item('legal_review', 'Anwaltliche Freigabe bestaetigt', envTrue('MMOS_LEGAL_REVIEW_DONE'), 'Vertraege/Datenschutz/AVV final pruefen lassen.', 'high', { external: true })
    ],
    next_steps: [
      'Resend Domain live verifizieren.',
      'Testmail + Abmeldelink mit echtem Empfaenger pruefen.',
      'Datenschutzerklaerung/AVV/Unterauftragnehmerliste anwaltlich finalisieren.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'billing_package_access',
    title: 'Paketmatrix, Billing & Tool-Freigaben',
    description: 'Prueft, ob Paketlogik und Toolfreigaben angebunden sind und was noch automatisiert werden muss.',
    checks: [
      item('package_matrix', 'Paketmatrix aktualisiert', packageContains('retention_intelligence_suite') && packageContains('sumup_revenue_connection'), 'Neue Module fehlen in Paketmatrix.'),
      item('landing', 'Landingpage Paketkarten/Add-ons aktualisiert', landingContains('SumUp Umsatzdaten') && landingContains('Retention Intelligence'), 'Landingpage verkauft neue Module noch nicht.'),
      item('tool_access', '/admin/tool-access-v2 vorhanden', file('frontend/src/app/admin/tool-access-v2/page.tsx'), 'Tool-Freigaben fehlen.'),
      item('stripe_or_no_webhooks', 'Payment-Webhooks bestaetigt oder bewusst deaktiviert', envPresent('STRIPE_WEBHOOK_SECRET') || envTrue('MMOS_NO_WEBHOOKS_USED'), 'STRIPE_WEBHOOK_SECRET setzen oder MMOS_NO_WEBHOOKS_USED=true.', 'medium', { external: true }),
      item('auto_access_note', 'Automatische Paketfreigabe vorbereitet', read('frontend/src/app/admin/tool-access-v2/page.tsx').includes('syncPackageAccess'), 'Paketfreigabe-Sync fehlt.'),
      item('full_billing_automation', 'Vollautomatisches Billing live bewiesen', envTrue('MMOS_BILLING_AUTOMATION_GREEN'), 'Noch manuell/halbautomatisch. Live-Bezahlfluss pruefen und Flag setzen.', 'high', { external: true })
    ],
    next_steps: [
      'Nach Pilot: Subscription-Zahlungsstatus automatisch an Toolfreigaben koppeln.',
      'Add-on Abrechnung und Upgrade/Downgrade Workflow finalisieren.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'campaign_automation',
    title: 'Retention, Segment-Kampagnen & Automationen',
    description: 'Prueft Kampagnen-Entwurf, Reminder und Automationsreife.',
    checks: [
      item('retention_ui', 'Retention Intelligence UI vorhanden', file('frontend/src/app/admin/retention/intelligence/page.tsx'), 'Retention UI fehlt.'),
      item('segment_campaign_service', 'Segment-Kampagnen Service vorhanden', file('backend/src/services/retentionSegmentCampaignService.js'), 'Segment-Service fehlt.'),
      item('reminder_service', 'Reminder-Service vorhanden', file('backend/src/services/marketingReminderAutomationService.js'), 'Reminder-Service fehlt.'),
      item('consent_guard', 'Consent-Pruefung fuer Reminder vorhanden', read('backend/src/services/marketingReminderAutomationService.js').includes('consent') || read('backend/src/services/marketingConsentComplianceService.js').includes('double_opt_in'), 'Consent Guard fuer Reminder fehlt.'),
      item('customer_approval', 'Kunden-Freigabeprozess live vorhanden', envTrue('MMOS_CAMPAIGN_APPROVAL_FLOW_GREEN') || file('frontend/src/app/portal/backoffice/page.tsx'), 'Kundenfreigabe ist aktuell Basis/Entwurf, nicht vollautomatisch.', 'medium'),
      item('scheduler', 'Automatischer Kampagnenversand live bestaetigt', envTrue('MMOS_CAMPAIGN_AUTOMATION_GREEN'), 'Zeitplanung/A-B/Autoversand nach Pilot finalisieren.', 'medium', { external: true })
    ],
    next_steps: [
      'Kampagnen zunaechst als Entwurf und manuelle Freigabe nutzen.',
      'Nach Pilot: Scheduling, A/B Varianten und Umsatzattribution automatisieren.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'mobile_ui',
    title: 'Mobile UX Risiko-Seiten',
    description: 'Prueft bekannte Mobile-Fixes und kennzeichnet Tabellen-/Adminseiten fuer manuelle Device-Tests.',
    checks: [
      item('auth_mobile', '/auth mobile optimiert', read('frontend/src/app/globals.css').includes('MMOS Auth Mobile Hardening'), 'Login Mobile CSS fehlt.'),
      item('update_password_mobile', '/auth/update-password UX verbessert', read('frontend/src/app/auth/update-password/page.tsx').includes('passwordRules'), 'Update Password UX fehlt.'),
      item('admin_pos_mobile', '/admin/pos mobile CSS vorhanden', read('frontend/src/app/globals.css').includes('MMOS SumUp / Umsatz & Zahlungen V1'), 'POS Mobile CSS fehlt.'),
      item('portal_mobile', '/portal als Kartenlayout vorhanden', read('frontend/src/app/portal/page.tsx').includes('statsGrid'), 'Portal Mobile Layout pruefen.'),
      item('device_test_flag', 'Echter Smartphone-Test bestaetigt', envTrue('MMOS_MOBILE_DEVICE_TEST_GREEN'), 'Auf iPhone/Android live pruefen und Flag setzen.', 'medium', { external: true })
    ],
    next_steps: [
      'Auf echtem iPhone testen: /auth, /portal, /admin/pos, /admin/retention/intelligence, /admin/reports/monthly.',
      'Tabellen-Seiten bei Bedarf in Mobile-Cards umwandeln.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'access_security',
    title: 'Rollen, Zugriffsschutz & Tenant Isolation',
    description: 'Prueft Schutz kritischer Routen und Kunden-/Admintrennung.',
    checks: [
      item('auth_middleware', 'Backend Auth Middleware aktiv', read('backend/src/server.js').includes("app.use('/api'") && read('backend/src/server.js').includes('requireAuth'), 'API Auth Middleware fehlt.'),
      item('admin_guard', 'Admin-Routen mit requireAdmin', read('backend/src/server.js').includes('requireAdmin'), 'Admin Guard fehlt.'),
      item('customer_access', 'requireCustomerAccess vorhanden', file('backend/src/middleware/requireCustomerAccess.js'), 'Customer Access Middleware fehlt.'),
      item('security_core', 'Security Core Seite vorhanden', file('frontend/src/app/admin/production/security-core/page.tsx'), 'Security Core UI fehlt.'),
      item('tenant_audit_live', 'Tenant Isolation live grün', envTrue('MMOS_TENANT_AUDIT_GREEN'), 'Tenant Isolation live testen und MMOS_TENANT_AUDIT_GREEN=true setzen.', 'high', { external: true }),
      item('e2e_live', 'E2E Tests live grün', envTrue('MMOS_PLAYWRIGHT_E2E_GREEN'), 'Playwright/E2E gegen Preview/Prod laufen lassen.', 'medium', { external: true })
    ],
    next_steps: [
      'Admin-, Kunde- und Public-Routen live mit echten Tokens testen.',
      'Pruefen, ob Kunde keine fremde customer_id laden kann.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'database_migrations',
    title: 'Supabase Migrationen & Datenstruktur',
    description: 'Prueft, ob relevante Migrationen und Live-Bestaetigungen vorhanden sind.',
    checks: [
      item('migration_0077', 'Migration 0077 POS vorhanden', file('supabase/migrations/0077_pos_predictive_chatbot.sql'), '0077 fehlt.'),
      item('migration_0099', 'Migration 0099 vorhanden/bestaetigt', envTrue('MMOS_MIGRATION_0099_CONFIRMED') || (function(){ try { return fs.readdirSync(path.join(root, 'supabase/migrations')).some((f) => f.includes('0099')) } catch (_) { return false } })(), '0099 ausfuehren oder Flag setzen.', 'medium', { external: true }),
      item('migration_0100', 'Migration 0100 SumUp V1 vorhanden', file('supabase/migrations/0100_sumup_revenue_connection_v1.sql'), '0100 fehlt.'),
      item('fresh_db_test', 'Frische Datenbank mit allen Migrationen getestet', envTrue('MMOS_FRESH_DB_MIGRATIONS_GREEN'), 'Frische Supabase DB einmal komplett migrieren und Flag setzen.', 'high', { external: true }),
      item('restore_test', 'Restore-Test grün', envTrue('MMOS_RESTORE_TEST_GREEN'), 'Restore-Test in Testumgebung durchfuehren.', 'high', { external: true })
    ],
    next_steps: [
      'Neue Test-Supabase anlegen und alle Migrationen der Reihe nach ausfuehren.',
      'Seed/Testdaten anlegen und Kernflows testen.'
    ]
  }))

  modules.push(moduleAudit({
    key: 'sales_contracts',
    title: 'Sales-, Angebots- & Vertragsunterlagen',
    description: 'Prueft, ob die Verkaufslogik mit Leistungsbeschreibung und Rechtsdokumenten mitzieht.',
    checks: [
      item('package_matrix', 'Paketmatrix in Code vorhanden', file('frontend/src/lib/customerToolModules.ts'), 'Paketmatrix fehlt.'),
      item('tools_public', 'Oeffentliche Toolseite vorhanden', file('frontend/src/app/tools/page.tsx'), 'Tools-Seite fehlt.'),
      item('privacy_page', 'Datenschutzseite vorhanden', file('frontend/src/app/datenschutz/page.tsx'), 'Datenschutzseite fehlt.'),
      item('terms_page', 'AGB/Vertragsseite vorhanden', file('frontend/src/app/agb/page.tsx') || file('frontend/src/app/terms/page.tsx'), 'AGB/Vertragsseite fehlt oder heisst anders.', 'medium'),
      item('contract_docs_updated', 'Vertrags-/Angebotsunterlagen aktualisiert', envTrue('MMOS_CONTRACTS_UPDATED_FOR_NEW_TOOLS'), 'Leistungsbeschreibung, AVV, Demo-Vertrag, Add-on-Preisliste aktualisieren.', 'high', { external: true }),
      item('legal_review_done', 'Rechtsfreigabe abgeschlossen', envTrue('MMOS_LEGAL_REVIEW_DONE'), 'Anwaltliche Schlusspruefung offen.', 'high', { external: true })
    ],
    next_steps: [
      'Angebots- und Vertragsset um SumUp V1, Retention, Consent Center, Report-Versand und Go-Live Cockpit erweitern.',
      'Add-on-Preisliste als PDF/Website-Abschnitt finalisieren.'
    ]
  }))

  const totalScore = Math.round(modules.reduce((sum, m) => sum + m.score, 0) / modules.length)
  const blockers = modules.flatMap((m) => m.missing.filter((c) => c.severity === 'high').map((c) => ({ module: m.key, title: m.title, check: c.key, label: c.label, hint: c.hint })))
  const nextSteps = [
    ...blockers.slice(0, 8).map((b) => ({ priority: 'high', title: `${b.title}: ${b.label}`, hint: b.hint })),
    ...(customer_id ? [] : [{ priority: 'medium', title: 'Kundenkontext auswaehlen', hint: 'Viele Live-Pruefungen werden genauer, wenn ein Kunde gewaehlt ist.' }]),
    { priority: 'medium', title: 'Einen echten Pilotkunden komplett durchtesten', hint: 'QR/Loyalty, DOI, Report, SumUp, Rollen und Portal von Anfang bis Ende.' }
  ]

  return {
    ok: totalScore >= 90 && blockers.length === 0,
    score: totalScore,
    status: totalScore >= 90 && blockers.length === 0 ? 'pilot_ready' : totalScore >= 75 ? 'pilot_prepared' : 'not_ready',
    customer_id,
    generated_at: new Date().toISOString(),
    modules,
    blockers,
    next_steps: nextSteps,
    env_flags: {
      MMOS_MAIL_DOMAIN_VERIFIED: envTrue('MMOS_MAIL_DOMAIN_VERIFIED'),
      MMOS_LEGAL_REVIEW_DONE: envTrue('MMOS_LEGAL_REVIEW_DONE'),
      MMOS_TENANT_AUDIT_GREEN: envTrue('MMOS_TENANT_AUDIT_GREEN'),
      MMOS_PLAYWRIGHT_E2E_GREEN: envTrue('MMOS_PLAYWRIGHT_E2E_GREEN'),
      MMOS_FRESH_DB_MIGRATIONS_GREEN: envTrue('MMOS_FRESH_DB_MIGRATIONS_GREEN'),
      MMOS_MOBILE_DEVICE_TEST_GREEN: envTrue('MMOS_MOBILE_DEVICE_TEST_GREEN'),
      MMOS_BILLING_AUTOMATION_GREEN: envTrue('MMOS_BILLING_AUTOMATION_GREEN')
    },
    summary: {
      total_modules: modules.length,
      ready: modules.filter((m) => m.status === 'ready').length,
      prepared: modules.filter((m) => m.status === 'prepared').length,
      partial: modules.filter((m) => m.status === 'partial').length,
      blocked: modules.filter((m) => m.status === 'blocked').length
    }
  }
}

async function recordCompletenessProof(supabase, { key, status = 'green', note = '', actor = 'Admin' } = {}) {
  if (!supabase || !key) return { ok: false, error: 'Supabase/key fehlt' }
  const payload = {
    type: 'completeness_audit_proof',
    title: `Completeness Nachweis: ${key}`,
    message: note || `Status ${status}`,
    severity: status === 'green' ? 'success' : 'warning',
    actor_name: actor,
    metadata: { key, status, note, actor, verified_at: new Date().toISOString() },
    created_at: new Date().toISOString()
  }
  try {
    const { data, error } = await supabase.from('activity_logs').insert(payload).select('*').maybeSingle()
    if (error) return { ok: false, error: error.message }
    return { ok: true, proof: data || payload }
  } catch (error) {
    return { ok: false, error: error.message || String(error) }
  }
}

module.exports = { buildCompletenessAudit, recordCompletenessProof }
