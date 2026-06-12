// Routes für den Branchen-Benchmark-Report.
// Admin-Operationen (Compute/Generate/Targets) + kundenscoped Read der Reports.
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const { BrancheBenchmarkService } = require('../services/brancheBenchmarkService')
const { renderAndStoreDocument } = require('../services/documentEngineV2Service')
const { captureToolError } = require('../lib/toolObservability')

const requireAdmin = authMiddleware({ roles: ['admin'] })

function parsePeriod(body = {}) {
  const start = body.period_start || body.start
  const end = body.period_end || body.end
  if (!start || !end) {
    const e = new Error('period_start und period_end (YYYY-MM-DD) sind Pflicht')
    e.status = 400
    throw e
  }
  return { start, end }
}

module.exports = function brancheBenchmarkRoutes(supabase) {
  const router = express.Router()
  const service = new BrancheBenchmarkService(supabase, { documentEngine: renderAndStoreDocument })

  // --- Admin: Zielwerte verwalten ---
  router.get('/targets', requireAdmin, async (req, res, next) => {
    try {
      res.json({ ok: true, targets: await service.getTargets(req.query.branch) })
    } catch (e) { next(e) }
  })

  router.put('/targets', requireAdmin, async (req, res, next) => {
    try {
      const target = await service.upsertTarget({ ...(req.body || {}), updated_by: req.user?.id || null })
      res.json({ ok: true, target })
    } catch (e) { next(e) }
  })

  // --- Admin: k-anonyme Aggregate berechnen ---
  router.post('/compute', requireAdmin, async (req, res, next) => {
    try {
      const period = parsePeriod(req.body)
      res.json({ ok: true, ...(await service.computeAggregates(period)) })
    } catch (e) {
      if (!e.status || e.status >= 500) captureToolError(e, { tool: 'branche_benchmark', action: 'compute' })
      res.status(e.status || 500).json({ ok: false, error: e.message })
    }
  })

  // --- Admin: Report für einen Kunden erzeugen ---
  router.post('/generate/:customer_id', requireAdmin, async (req, res, next) => {
    try {
      const period = parsePeriod(req.body)
      const report = await service.generateReport(req, { customer_id: req.params.customer_id, period })
      res.json({ ok: true, report })
    } catch (e) {
      if (!e.status || e.status >= 500) captureToolError(e, { tool: 'branche_benchmark', action: 'generate', customer_id: req.params.customer_id })
      res.status(e.status || 500).json({ ok: false, error: e.message })
    }
  })

  // --- Kunde: eigene Reports lesen ---
  router.get('/:customer_id/reports', requireCustomerAccess(), async (req, res, next) => {
    try {
      res.json({ ok: true, reports: await service.listReports(req.params.customer_id) })
    } catch (e) { next(e) }
  })

  return router
}
