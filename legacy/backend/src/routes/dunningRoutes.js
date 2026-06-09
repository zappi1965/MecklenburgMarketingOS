const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const dunning = require('../services/dunningService')

function dunningRoutes() {
  const router = express.Router()

  router.get('/levels/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await dunning.listLevels(req.params.customer_id)
      res.json({ ok: true, levels: data })
    } catch (e) { next(e) }
  })

  router.post('/levels/:customer_id/defaults', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await dunning.ensureDefaults(req.params.customer_id)
      res.json({ ok: true, levels: data })
    } catch (e) { next(e) }
  })

  router.post('/levels/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await dunning.upsertLevel({ customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, level: data })
    } catch (e) { next(e) }
  })

  router.delete('/levels/:customer_id/:level', requireCustomerAccess(), async (req, res, next) => {
    try {
      await dunning.deleteLevel({ customer_id: req.params.customer_id, level: req.params.level })
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  router.post('/run-now', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const result = await dunning.runDunningSweep()
      res.json({ ok: true, result })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = dunningRoutes
