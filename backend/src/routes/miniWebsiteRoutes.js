// Kundenscoped Routes für Mini-Website / Google-Booster.
const express = require('express')
const { MiniWebsiteService } = require('../services/miniWebsiteService')

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
      res.json({ ok: true, site: await service.update(req.params.customer_id, req.body || {}) })
    } catch (e) { next(e) }
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
