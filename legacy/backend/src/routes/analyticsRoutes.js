const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const analytics = require('../services/analyticsService')

function analyticsRoutes() {
  const router = express.Router()

  router.post('/peer-benchmark/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const period_start = req.body?.period_start
      const period_end = req.body?.period_end
      if (!period_start || !period_end) return res.status(400).json({ ok: false, error: 'period_start und period_end erforderlich' })
      const r = await analytics.computePeerBenchmark({ customer_id: req.params.customer_id, period_start, period_end })
      res.json({ ok: true, snapshot: r })
    } catch (e) { next(e) }
  })

  router.post('/cohorts/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await analytics.computeCohortAnalysis({
        customer_id: req.params.customer_id,
        source: req.body?.source || 'loyalty_signup',
        months: Math.min(24, Number(req.body?.months || 6))
      })
      res.json({ ok: true, cohorts: r })
    } catch (e) { next(e) }
  })

  router.post('/clv/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await analytics.computeClvSegments({ customer_id: req.params.customer_id })
      res.json({ ok: true, segments: r })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = analyticsRoutes
