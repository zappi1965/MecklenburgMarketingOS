// Kundenscoped Routes für Mini-Website / Google-Booster.
const express = require('express')
const { MiniWebsiteService } = require('../services/miniWebsiteService')
const { miniWebsiteUpdateSchema, parseOrThrow } = require('../validators/marketingSchemas')
const { captureToolError } = require('../lib/toolObservability')

module.exports = function miniWebsiteRoutes(supabase) {
  const router = express.Router()
  const service = new MiniWebsiteService(supabase)

  router.get('/:customer_id', async (req, res, next) => {
    try {
      res.json({ ok: true, site: await service.getOrCreate(req.params.customer_id) })
    } catch (e) { next(e) }
  })

  router.put('/:customer_id', async (req, res, next) => {
    try {
      const body = parseOrThrow(miniWebsiteUpdateSchema, req.body)
      res.json({ ok: true, site: await service.update(req.params.customer_id, body) })
    } catch (e) {
      if (!e.status || e.status >= 500) captureToolError(e, { tool: 'mini_website', action: 'update', customer_id: req.params.customer_id })
      res.status(e.status || 500).json({ ok: false, error: e.message, code: e.code })
    }
  })

  // Audit-Ergebnis (aus dem Frontend-Mini-Audit) speichern -> Booster-Checkliste.
  router.post('/:customer_id/booster', async (req, res, next) => {
    try {
      const audit = (req.body || {}).audit || req.body || {}
      res.json({ ok: true, site: await service.saveBooster(req.params.customer_id, audit) })
    } catch (e) { next(e) }
  })

  return router
}
