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




function maskSecret(value = '') {
  const v = String(value || '')
  if (!v) return null
  if (v.length <= 10) return `${v.slice(0, 2)}***`
  return `${v.slice(0, 6)}…${v.slice(-4)}`
}

function parseSupabaseUrl(value = '') {
  try {
    const url = new URL(value)
    return {
      valid_url: true,
      protocol: url.protocol,
      host: url.host,
      looks_like_supabase_project: /^https:\/\/[^/.]+\.supabase\.co\/?$/.test(value.trim())
    }
  } catch (_) {
    return { valid_url: false, protocol: null, host: null, looks_like_supabase_project: false }
  }
}

function envDiagnostics() {
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const placesKey = process.env.GOOGLE_PLACES_API_KEY || ''
  const googleOauthMissing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'].filter((key) => !process.env[key])
  const supabaseInfo = parseSupabaseUrl(supabaseUrl)
  const recommendations = []
  if (!supabaseUrl || !serviceRole) recommendations.push('Railway Backend: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen.')
  if (supabaseUrl && !supabaseInfo.looks_like_supabase_project) recommendations.push('SUPABASE_URL sollte exakt wie https://<project-ref>.supabase.co aussehen, ohne /rest/v1 oder anon/public Pfad.')
  if (serviceRole && !(serviceRole.startsWith('eyJ') || serviceRole.startsWith('sb_secret_') || serviceRole.startsWith('sb_sec'))) recommendations.push('SUPABASE_SERVICE_ROLE_KEY sieht ungewöhnlich aus. Akzeptiert werden klassische JWT-Service-Role-Keys oder neue Supabase Secret Keys (sb_secret_...).')
  if (!placesKey) recommendations.push('GOOGLE_PLACES_API_KEY fehlt: Lead-Suche und Google-Business-Audit laufen dann nicht live.')
  if (placesKey && !/^AIza/.test(placesKey)) recommendations.push('GOOGLE_PLACES_API_KEY sieht ungewöhnlich aus. Google Maps API Keys beginnen häufig mit AIza.')
  if (googleOauthMissing.length) recommendations.push(`Google OAuth fehlt für GBP/Search Console/Analytics Sync: ${googleOauthMissing.join(', ')}.`)
  return {
    supabase: {
      url_present: Boolean(supabaseUrl),
      url_masked: supabaseUrl ? supabaseUrl.replace(/^https:\/\/([^/.]+).*$/, 'https://$1.supabase.co') : null,
      ...supabaseInfo,
      service_role_present: Boolean(serviceRole),
      service_role_masked: maskSecret(serviceRole)
    },
    google_places: {
      present: Boolean(placesKey),
      masked: maskSecret(placesKey),
      expected_application_restriction: 'Serverseitig: IP addresses oder zunächst keine Application restriction; keine Website/HTTP referrer restriction.',
      expected_api_restriction: 'Places API für /maps/api/place/textsearch/json'
    },
    google_oauth: {
      configured: googleOauthMissing.length === 0,
      missing_env: googleOauthMissing,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || null
    },
    railway: {
      trust_proxy_hops: Number(process.env.TRUST_PROXY_HOPS || process.env.RAILWAY_TRUST_PROXY_HOPS || 1),
      enable_demo_mode: process.env.ENABLE_DEMO_MODE === 'true',
      node_env: process.env.NODE_ENV || null
    },
    recommendations
  }
}

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
    const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    return { table, ok: !error, count: error ? null : (count || 0), error: error ? error.message : null }
  } catch (error) {
    return { table, ok: false, count: null, error: error.message || String(error) }
  }
}

function cleanIntegrationEnv(value) {
  const raw = String(value || '').trim().replace(/^['\"]|['\"]$/g, '').replace(/\/+$/, '')
  if (!raw) return ''
  if (['null', 'undefined', 'false', '0', '-'].includes(raw.toLowerCase())) return ''
  return raw
}

function maskUrl(value = '') {
  try {
    const url = new URL(String(value || '').trim())
    return `${url.protocol}//${url.host}`
  } catch (_) {
    return value ? 'ungueltige-url' : null
  }
}

function describeFetchError(error) {
  if (!error) return 'Unbekannter Fehler'
  if (error.name === 'AbortError') return 'Zeitüberschreitung beim Verbindungsaufbau'
  return error.message || String(error)
}

async function checkGotenbergRuntime() {
  const raw = cleanIntegrationEnv(process.env.GOTENBERG_URL)
  if (!raw) {
    return {
      configured: false,
      connected: false,
      ok: false,
      missing_env: ['GOTENBERG_URL'],
      error: 'GOTENBERG_URL fehlt.',
      hint: 'PDF-Erzeugung nutzt HTML-/Druckansicht als Fallback.'
    }
  }

  let base
  try {
    base = new URL(raw).origin
  } catch (_) {
    return {
      configured: true,
      connected: false,
      ok: false,
      missing_env: [],
      url_masked: 'ungueltige-url',
      error: 'GOTENBERG_URL ist keine gültige URL.',
      hint: 'Setze z. B. die öffentliche URL deines Gotenberg-Services, nicht localhost und nicht eine private Browser-URL.'
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.GOTENBERG_HEALTH_TIMEOUT_MS || 5000))
  try {
    const res = await fetch(`${base}/health`, { signal: controller.signal, cache: 'no-store' })
    return {
      configured: true,
      connected: res.ok,
      ok: res.ok,
      missing_env: [],
      status: res.status,
      url_masked: maskUrl(base),
      error: res.ok ? null : `Gotenberg Healthcheck antwortet mit HTTP ${res.status}.`,
      hint: res.ok ? 'Gotenberg ist erreichbar.' : 'Prüfe, ob der Gotenberg-Service läuft und von Railway aus erreichbar ist.'
    }
  } catch (error) {
    return {
      configured: true,
      connected: false,
      ok: false,
      missing_env: [],
      url_masked: maskUrl(base),
      error: describeFetchError(error),
      hint: 'GOTENBERG_URL ist gesetzt, aber vom Backend nicht erreichbar. Nutze die öffentliche Service-URL oder Railway private networking nur, wenn beide Services im selben Railway-Projekt/Netz sind.'
    }
  } finally {
    clearTimeout(timer)
  }
}

function systemRoutes(supabaseAdmin) {
  const router = express.Router()

  router.get('/health', async (_, res) => {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    const gotenbergRuntime = await checkGotenbergRuntime()
    res.json({
      ok: true,
      service: 'MMOS Core Backend',
      time: new Date().toISOString(),
      supabase_configured: Boolean(supabaseAdmin),
      supabase: Boolean(supabaseAdmin),
      resend: Boolean(process.env.RESEND_API_KEY),
      gotenberg: gotenbergRuntime.connected,
      gotenberg_configured: gotenbergRuntime.configured,
      gotenberg_status: gotenbergRuntime,
      google_oauth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
      google_places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      missing_env: missing
    })
  })


  router.get('/env-check', (_, res) => {
    res.json({ ok: true, time: new Date().toISOString(), diagnostics: envDiagnostics() })
  })


  router.get('/status', async (_, res) => {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    const tables = [...CORE_TABLES, ...OPTIONAL_TABLES]
    let checks = []
    if (supabaseAdmin && missing.length === 0) {
      checks = await Promise.all(tables.map((table) => checkTable(supabaseAdmin, table)))
    } else {
      checks = tables.map((table) => ({ table, ok: false, skipped: true, error: 'Supabase ENV fehlt oder Backend nicht konfiguriert.' }))
    }
    const missingSchema = checks.filter((check) => !check.ok && !check.skipped).map((check) => check.table)
    const diagnostics = envDiagnostics()
    const gotenbergRuntime = await checkGotenbergRuntime()
    const integrations = {
      google_oauth: { connected: diagnostics.google_oauth.configured, missing_env: diagnostics.google_oauth.missing_env, purpose: 'Google Reviews, Search Console, Analytics und Business Profile Sync' },
      google_places: { connected: diagnostics.google_places.present, missing_env: diagnostics.google_places.present ? [] : ['GOOGLE_PLACES_API_KEY'], purpose: 'Lead Scraper, Google Business Audit und lokale Wettbewerberdaten' },
      gotenberg: { connected: gotenbergRuntime.connected, configured: gotenbergRuntime.configured, missing_env: gotenbergRuntime.missing_env || [], error: gotenbergRuntime.error, hint: gotenbergRuntime.hint, status: gotenbergRuntime.status, url_masked: gotenbergRuntime.url_masked, purpose: 'serverseitige PDF-Erzeugung' },
      mail: { connected: Boolean(cleanIntegrationEnv(process.env.RESEND_API_KEY) || cleanIntegrationEnv(process.env.SMTP_HOST)), missing_env: (cleanIntegrationEnv(process.env.RESEND_API_KEY) || cleanIntegrationEnv(process.env.SMTP_HOST)) ? [] : ['RESEND_API_KEY oder SMTP_HOST'], purpose: 'Einladungen, Angebote, Reports und Mahnungen per Mail' }
    }
    res.json({
      ok: true,
      service: 'MMOS System Center',
      time: new Date().toISOString(),
      mode: missing.length ? 'env_fallback' : 'live_probe',
      health: {
        ok: Boolean(supabaseAdmin) && missing.length === 0,
        supabase_configured: Boolean(supabaseAdmin),
        missing_env: missing,
        google_places: diagnostics.google_places.present,
        google_oauth: diagnostics.google_oauth.configured,
        mail: integrations.mail.connected,
        gotenberg: integrations.gotenberg.connected
      },
      ready: {
        ok: Boolean(supabaseAdmin) && missing.length === 0,
        ready: Boolean(supabaseAdmin) && missing.length === 0,
        missing_env: missing,
        note: missing.length ? 'Öffentlicher Safe-Status: Details ohne Auth nur maskiert.' : 'Backend und Supabase ENV sind vorhanden.'
      },
      schema: {
        ok: true,
        schema_ready: missingSchema.length === 0 && !missing.length,
        checks,
        missing: missingSchema,
        hint: missing.length ? 'Schema-Detailprüfung benötigt SUPABASE_URL und SERVICE_ROLE im Railway Backend.' : (missingSchema.length ? 'Einige optionale Tabellen fehlen oder sind nicht erreichbar.' : 'Geprüfte Tabellen erreichbar.')
      },
      business_tools: {
        ok: true,
        google_places: diagnostics.google_places.present,
        pdf: integrations.gotenberg.connected,
        mail: integrations.mail.connected,
        note: diagnostics.google_places.present ? 'Live Lead-Suche kann Places-Daten nutzen.' : 'GOOGLE_PLACES_API_KEY fehlt; Lead-Suche nutzt keine echten Places-Daten.'
      },
      integrations,
      customer_access: {
        strategy: 'RLS + Backend customer_id checks + admin/service-role bypass',
        protected_tables: checks.filter((check) => check.ok).length,
        tables: checks.map((check) => ({ table: check.table, customer_scoped: OPTIONAL_TABLES.includes(check.table) || CORE_TABLES.includes(check.table), ok: check.ok })).slice(0, 100)
      },
      diagnostics
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
        { version: 'V42.24', file: 'SQL_V42_24_SECURITY_PRIVACY_CENTER.sql', tables: ['loyalty_security_settings','loyalty_member_security_scores','security_events','dsar_requests'] },
        { version: 'V42.24.4', file: 'SQL_V42_24_4_TYPE_SAFE_LIVE_DEMO_SPLIT.sql', tables: ['is_demo columns on customer-scoped tables'] },
        { version: 'V42.24.7', file: 'SQL_V42_24_7_BACKEND_ENV_PROVIDER_HOTFIX.sql', tables: ['schema_migrations_mmos'] }
      ]
    })
  })


  router.get('/integration-status', async (_, res) => {
    const googleOauthMissing = missingEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'])
    const googlePlacesMissing = missingEnv(['GOOGLE_PLACES_API_KEY'])
    const gotenbergRuntime = await checkGotenbergRuntime()
    res.json({
      ok: true,
      google_oauth: { connected: googleOauthMissing.length === 0, missing_env: googleOauthMissing, purpose: 'Google Reviews, Search Console, Analytics und Business Profile Sync' },
      google_places: { connected: googlePlacesMissing.length === 0, missing_env: googlePlacesMissing, purpose: 'Lead Scraper, Google Business Audit und lokale Wettbewerberdaten' },
      gotenberg: { connected: gotenbergRuntime.connected, configured: gotenbergRuntime.configured, missing_env: gotenbergRuntime.missing_env || [], error: gotenbergRuntime.error, hint: gotenbergRuntime.hint, status: gotenbergRuntime.status, url_masked: gotenbergRuntime.url_masked, purpose: 'serverseitige PDF-Erzeugung' },
      mail: { connected: Boolean(cleanIntegrationEnv(process.env.RESEND_API_KEY) || cleanIntegrationEnv(process.env.SMTP_HOST)), missing_env: (cleanIntegrationEnv(process.env.RESEND_API_KEY) || cleanIntegrationEnv(process.env.SMTP_HOST)) ? [] : ['RESEND_API_KEY oder SMTP_HOST'], purpose: 'Einladungen, Angebote, Reports und Mahnungen per Mail' }
    })
  })


  router.get('/security-center', async (_, res) => {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    const health = {
      ok: Boolean(supabaseAdmin) && missing.length === 0,
      supabase_configured: Boolean(supabaseAdmin),
      missing_env: missing,
      gotenberg: Boolean(cleanIntegrationEnv(process.env.GOTENBERG_URL)),
      google_oauth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
      google_places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      mail: Boolean(cleanIntegrationEnv(process.env.RESEND_API_KEY) || cleanIntegrationEnv(process.env.SMTP_HOST))
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
