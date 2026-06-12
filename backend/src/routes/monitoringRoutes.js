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

  // Aggregierter Worker-Health-Überblick: letzter Lauf je Job (inkl. neuer Worker).
  router.get('/jobs', async (_, res, next) => {
    try {
      const { data } = await supabase.from('job_runs').select('*').order('finished_at', { ascending: false }).limit(200)
      const byJob = {}
      for (const row of data || []) {
        const name = row.job_name || 'unknown'
        if (!byJob[name]) {
          byJob[name] = { job_name: name, last_status: row.status, last_run_at: row.finished_at || row.created_at, last_message: row.message || null, runs: 0, failures: 0 }
        }
        byJob[name].runs += 1
        if (row.status === 'failed') byJob[name].failures += 1
      }
      const jobs = Object.values(byJob)
      res.json({ ok: true, jobs, degraded: jobs.filter((j) => j.last_status === 'failed').map((j) => j.job_name) })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = monitoringRoutes
