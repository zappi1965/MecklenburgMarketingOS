const express = require('express')

function monitoringRoutes(supabase) {
  const router = express.Router()

  router.get('/status', async (_, res) => {
    const checks = {
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
      gotenberg: Boolean(process.env.GOTENBERG_URL),
      sentry: Boolean(process.env.SENTRY_DSN),
      publicAppUrl: Boolean(process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL)
    }

    res.json({
      ok: Object.values(checks).every(Boolean),
      checks,
      timestamp: new Date().toISOString()
    })
  })

  router.get('/audit-summary', async (_, res, next) => {
    try {
      const { data: jobs } = await supabase.from('job_runs').select('*').order('created_at', { ascending: false }).limit(20)
      const { data: logs } = await supabase.from('security_audit_logs').select('*').order('created_at', { ascending: false }).limit(20)
      res.json({ ok: true, jobs: jobs || [], logs: logs || [] })
    } catch (e) {
      next(e)
    }
  })

  return router
}

module.exports = monitoringRoutes
