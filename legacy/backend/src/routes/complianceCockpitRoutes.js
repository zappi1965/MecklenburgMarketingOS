const express = require('express')
const svc = require('../services/complianceCockpitService')

// Admin-only.
function complianceCockpitRoutes() {
  const router = express.Router()

  router.get('/snapshot', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const data = await svc.snapshot({ customer_id: req.query?.customer_id || null })
      res.json({ ok: true, snapshot: data })
    } catch (e) { next(e) }
  })

  router.get('/processing-activities', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const data = await svc.listProcessingActivities(req.query?.customer_id || null)
      res.json({ ok: true, activities: data })
    } catch (e) { next(e) }
  })

  router.post('/processing-activities', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const data = await svc.upsertProcessingActivity(req.body || {})
      res.json({ ok: true, activity: data })
    } catch (e) { next(e) }
  })

  router.get('/processors', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const data = await svc.listProcessors(req.query?.customer_id || null)
      res.json({ ok: true, processors: data })
    } catch (e) { next(e) }
  })

  router.post('/processors', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const data = await svc.upsertProcessor(req.body || {})
      res.json({ ok: true, processor: data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = complianceCockpitRoutes
