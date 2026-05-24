const express = require('express')
const { missingEnv } = require('../utils/env')

const CORE_TABLES = ['customers']
const OPTIONAL_TABLES = [
  'landing_page_settings',
  'integrations',
  'oauth_tokens',
  'customer_seo_metrics',
  'activity_logs',
  'qr_campaigns',
  'loyalty_programs',
  'loyalty_rewards',
  'loyalty_reward_rules',
  'staff_codes',
  'public_landing_pages',
  'invoices',
  'tickets',
  'knowledge_articles',
  'competitor_benchmarks',
  'google_business_audits',
  'mini_audits',
  'prospect_leads',
  'generated_offers',
  'generated_contracts',
  'dunning_cases',
  'customer_health_scores',
  'acquisition_campaigns',
  'api_usage_cache',
  'data_integrity_checks',
  'onboarding_checklists',
  'monthly_reports',
  'approval_requests',
  'output_documents',
  'customer_registrations',
  'customer_invites',
  'customer_users',
  'user_profiles',
  'schema_migrations_mmos',
  'loyalty_security_settings',
  'loyalty_member_security_scores',
  'security_events',
  'dsar_requests'
]



async function listCustomerScopedTables(supabaseAdmin) {
  if (!supabaseAdmin) return []
  try {
    const { data, error } = await supabaseAdmin.rpc('mmos_customer_scoped_tables')
    if (!error && Array.isArray(data)) return data
  } catch (_) {}
  return []
}

async function checkTable(supabaseAdmin, table) {
  try {
    const { error } = await supabaseAdmin.from(table).select('*').limit(1)
    return { table, ok: !error, error: error ? error.message : null }
  } catch (error) {
    return { table, ok: false, error: error.message || String(error) }
  }
}

function systemRoutes(supabaseAdmin) {
  const router = express.Router()

  router.get('/health', (_, res) => {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    res.json({
      ok: true,
      service: 'MMOS Core Backend',
      time: new Date().toISOString(),
      supabase_configured: Boolean(supabaseAdmin),
      supabase: Boolean(supabaseAdmin),
      resend: Boolean(process.env.RESEND_API_KEY),
      gotenberg: Boolean(process.env.GOTENBERG_URL),
      google_oauth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
      google_places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      missing_env: missing
    })
  })

  router.get('/ready', async (_, res) => {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    if (!supabaseAdmin || missing.length) {
      return res.status(503).json({
        ok: false,
        ready: false,
        code: 'SUPABASE_ENV_MISSING',
        error: 'Supabase ist nicht vollständig konfiguriert.',
        missing_env: missing
      })
    }

    const coreChecks = await Promise.all(CORE_TABLES.map((table) => checkTable(supabaseAdmin, table)))
    const optionalChecks = await Promise.all(OPTIONAL_TABLES.map((table) => checkTable(supabaseAdmin, table)))
    const failedCore = coreChecks.filter((check) => !check.ok)
    const missingOptional = optionalChecks.filter((check) => !check.ok)

    const payload = {
      ok: failedCore.length === 0,
      ready: failedCore.length === 0,
      service: 'MMOS Core Backend',
      time: new Date().toISOString(),
      checks: {
        core_tables: coreChecks,
        optional_tables: optionalChecks
      },
      missing_optional_schema: missingOptional.map((check) => check.table),
      hint: missingOptional.length
        ? 'Kernsystem ist erreichbar. Einige optionale Tabellen/Features fehlen noch oder wurden noch nicht migriert.'
        : 'Backend und Supabase sind erreichbar.'
    }

    return res.status(failedCore.length ? 503 : 200).json(payload)
  })

  router.get('/schema', async (_, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
    }
    const tables = [...CORE_TABLES, ...OPTIONAL_TABLES]
    const checks = await Promise.all(tables.map((table) => checkTable(supabaseAdmin, table)))
    const missing = checks.filter((check) => !check.ok).map((check) => check.table)
    res.json({
      ok: true,
      schema_ready: missing.length === 0,
      checks,
      missing,
      hint: missing.length ? 'Schema-Endpunkt erreichbar. Einige optionale Tabellen fehlen noch; führe die gebündelte SQL-Migration aus.' : 'Alle geprüften Tabellen vorhanden.',
      migrations: [
        { version: 'V42.14', file: 'SQL_LANDING_PAGE_SETTINGS_V42_14.sql', tables: ['landing_page_settings'] },
        { version: 'V42.16', file: 'SQL_V42_16_STABILITY_INTEGRATION_STATUS.sql', tables: ['integrations','oauth_tokens'] },
        { version: 'V42.17', file: 'SQL_V42_17_BUSINESS_TOOLS.sql', tables: ['knowledge_articles','competitor_benchmarks','google_business_audits','mini_audits','prospect_leads','generated_offers','generated_contracts','dunning_cases','customer_health_scores'] },
        { version: 'V42.18', file: 'SQL_V42_18_AKQUISE_KAMPAGNEN_CENTER.sql', tables: ['acquisition_campaigns'] },
        { version: 'V42.19', file: 'SQL_V42_19_STABILITY_DATA_INTEGRITY.sql', tables: ['activity_logs','api_usage_cache','data_integrity_checks'] },
        { version: 'V42.20', file: 'SQL_V42_20_PROFESSIONAL_CX_OUTPUT.sql', tables: ['onboarding_checklists','monthly_reports','approval_requests','output_documents'] },
        { version: 'V42.21', file: 'SQL_V42_21_PRODUCT_FIXES_CONSOLIDATED.sql', tables: ['landing_page_settings','knowledge_articles','competitor_benchmarks','google_business_audits','mini_audits','prospect_leads','generated_offers','generated_contracts','dunning_cases','customer_health_scores','acquisition_campaigns','api_usage_cache','data_integrity_checks','onboarding_checklists','approval_requests','output_documents','loyalty_rewards','loyalty_reward_rules','staff_codes','public_landing_pages','customer_registrations','customer_invites','customer_users'] },
        { version: 'V42.21.3', file: 'SQL_V42_21_3_CUSTOMER_LOGIN_APPROVAL.sql', tables: ['customer_registrations','customer_invites','customer_users','user_profiles'] },
        { version: 'V42.21.4', file: 'SQL_V42_21_4_LIVE_ADMIN_PROFILES.sql', tables: ['user_profiles'] },
        { version: 'V42.21.5', file: 'SQL_V42_21_5_INTERNAL_DEMO_ACCESS.sql', tables: ['landing_page_settings'] },
        { version: 'V42.23', file: 'SQL_V42_23_STABILITY_PRODUCTION_READINESS.sql', tables: ['activity_logs','api_usage_cache','data_integrity_checks','customer_invites','user_profiles'] },
        { version: 'V42.24', file: 'SQL_V42_24_SECURITY_PRIVACY_CENTER.sql', tables: ['loyalty_security_settings','loyalty_member_security_scores','security_events','dsar_requests'] }
      ]
    })
  })


  router.get('/integration-status', (_, res) => {
    const googleOauthMissing = missingEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'])
    const googlePlacesMissing = missingEnv(['GOOGLE_PLACES_API_KEY'])
    res.json({
      ok: true,
      google_oauth: { connected: googleOauthMissing.length === 0, missing_env: googleOauthMissing, purpose: 'Google Reviews, Search Console, Analytics und Business Profile Sync' },
      google_places: { connected: googlePlacesMissing.length === 0, missing_env: googlePlacesMissing, purpose: 'Lead Scraper, Google Business Audit und lokale Wettbewerberdaten' },
      gotenberg: { connected: Boolean(process.env.GOTENBERG_URL), missing_env: process.env.GOTENBERG_URL ? [] : ['GOTENBERG_URL'], purpose: 'serverseitige PDF-Erzeugung' },
      mail: { connected: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST), missing_env: (process.env.RESEND_API_KEY || process.env.SMTP_HOST) ? [] : ['RESEND_API_KEY oder SMTP_HOST'], purpose: 'Einladungen, Angebote, Reports und Mahnungen per Mail' }
    })
  })


  router.get('/security-center', async (_, res) => {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    const health = {
      ok: Boolean(supabaseAdmin) && missing.length === 0,
      supabase_configured: Boolean(supabaseAdmin),
      missing_env: missing,
      gotenberg: Boolean(process.env.GOTENBERG_URL),
      google_oauth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
      google_places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      mail: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST)
    }

    let accessTables = []
    try {
      if (supabaseAdmin) {
        const scoped = await listCustomerScopedTables(supabaseAdmin)
        accessTables = scoped.map((x) => ({ table_name: x.table_name || x.table || x }))
      }
    } catch (_) {}

    let securityEvents = []
    let dsar = []
    try {
      if (supabaseAdmin) {
        const ev = await supabaseAdmin.from('security_events').select('*').order('created_at', { ascending: false }).limit(25)
        securityEvents = ev.data || []
      }
    } catch (_) {}
    try {
      if (supabaseAdmin) {
        const rq = await supabaseAdmin.from('dsar_requests').select('*').order('created_at', { ascending: false }).limit(25)
        dsar = rq.data || []
      }
    } catch (_) {}

    res.json({
      ok: true,
      health,
      customer_access: {
        strategy: 'RLS + Backend customer_id checks + admin/service-role bypass',
        protected_tables: accessTables.length,
        tables: accessTables.map((r) => ({ table: r.table_name, customer_scoped: true })).slice(0, 100),
        note: 'Führe SQL_V42_24_SECURITY_PRIVACY_CENTER.sql aus, um RLS-Hilfsfunktionen und Policies anzulegen.'
      },
      security_events: securityEvents,
      dsar_requests: dsar,
      controls: {
        login_rate_limit: true,
        admin_profile_hardening: true,
        demo_live_separation: true,
        qr_daily_point_limit: true,
        loyalty_suspicion_score: true,
        dsar_workflow: true
      }
    })
  })

  router.get('/customer-access-audit', async (_, res) => {
    const checks = await Promise.all([...CORE_TABLES, ...OPTIONAL_TABLES].map((table) => checkTable(supabaseAdmin, table)))
    res.json({ ok: true, checks, customer_id_required: true, hint: 'Kundenrollen müssen backend- und RLS-seitig auf customer_id begrenzt werden.' })
  })

  return router
}

module.exports = systemRoutes
