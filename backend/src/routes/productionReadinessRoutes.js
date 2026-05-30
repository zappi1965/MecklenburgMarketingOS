const express = require('express')
const { listAdminLogs, recordAdminLog } = require('../services/adminLogService')
const { apiUsageSummary } = require('../services/apiCostControlService')
const { getSentry } = require('../services/sentryService')

function requireAdminRoute(req, res, next) {
  if (req.userRole !== 'admin') return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: 'Nur Adminzugriff.' })
  next()
}

function envBool(name) { return Boolean(process.env[name]) }

module.exports = function productionReadinessRoutes(supabase) {
  const router = express.Router()

  router.post('/client-error', async (req, res) => {
    const body = req.body || {}
    await recordAdminLog(supabase, {
      event_type: 'client_error',
      severity: 'error',
      actor_user_id: req.user?.id || null,
      actor_email: req.user?.email || null,
      actor_role: req.userRole || null,
      customer_id: req.userProfile?.customer_id || null,
      route: body.pathname || req.get('referer') || null,
      method: 'CLIENT',
      message: body.message || 'Frontend error',
      user_agent: req.headers['user-agent'],
      metadata: { source: 'ClientErrorReporter', ...body }
    })
    res.json({ ok: true })
  })

  router.get('/status', requireAdminRoute, async (req, res, next) => {
    try {
      const { enabled: sentryEnabled } = getSentry()
      const checks = {
        supabase: envBool('SUPABASE_URL') && envBool('SUPABASE_SERVICE_ROLE_KEY'),
        sentry: sentryEnabled || envBool('SENTRY_DSN'),
        gotenberg: envBool('GOTENBERG_URL'),
        google_places: envBool('GOOGLE_PLACES_API_KEY'),
        route_guard: process.env.NEXT_PUBLIC_REQUIRE_ROUTE_GUARD === 'true' || process.env.REQUIRE_ROUTE_GUARD === 'true',
        document_bucket: Boolean(process.env.MMOS_DOCUMENT_BUCKET || process.env.SUPABASE_DOCUMENT_BUCKET),
        api_cost_control: process.env.API_COST_CONTROL_ENABLED !== 'false',
        backup_configured: Boolean(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL)
      }
      const usage = await apiUsageSummary(supabase, { since: new Date(Date.now() - 24*60*60*1000).toISOString(), limit: 500 }).catch((e) => ({ error: e.message, totals: {} }))
      res.json({ ok: Object.values(checks).every(Boolean), checks, usage_24h: usage.totals || {}, timestamp: new Date().toISOString() })
    } catch (e) { next(e) }
  })

  router.get('/admin-logs', requireAdminRoute, async (req, res, next) => {
    try { res.json({ ok: true, logs: await listAdminLogs(supabase, req.query || {}) }) }
    catch (e) { next(e) }
  })

  router.get('/api-usage', requireAdminRoute, async (req, res, next) => {
    try { res.json({ ok: true, ...(await apiUsageSummary(supabase, req.query || {})) }) }
    catch (e) { next(e) }
  })

  router.get('/backup-runs', requireAdminRoute, async (req, res, next) => {
    try {
      const { data, error } = await supabase.from('backup_runs').select('*').order('created_at', { ascending: false }).limit(Math.min(200, Number(req.query.limit) || 50))
      if (error) throw error
      res.json({ ok: true, runs: data || [] })
    } catch (e) { next(e) }
  })

  router.post('/backup-runs', requireAdminRoute, async (req, res, next) => {
    try {
      const row = {
        status: req.body?.status || 'manual_marker',
        backup_type: req.body?.backup_type || 'manual',
        storage_path: req.body?.storage_path || null,
        size_bytes: req.body?.size_bytes || null,
        checksum_sha256: req.body?.checksum_sha256 || null,
        metadata: req.body?.metadata || {},
        created_by: req.user?.id || null,
        created_at: new Date().toISOString()
      }
      const { data, error } = await supabase.from('backup_runs').insert(row).select('*').maybeSingle()
      if (error) throw error
      await recordAdminLog(supabase, { event_type: 'backup_run_recorded', severity: 'info', actor_user_id: req.user?.id, actor_email: req.user?.email, message: 'Backup-Run wurde protokolliert.', metadata: row })
      res.json({ ok: true, run: data })
    } catch (e) { next(e) }
  })

  return router
}
