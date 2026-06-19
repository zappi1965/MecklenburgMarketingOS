// Kundenscoped Routes für "Aktionen & Angebote".
const express = require('express')
const { DealCampaignService } = require('../services/dealCampaignService')

module.exports = function dealCampaignRoutes(supabase) {
  const router = express.Router()
  const service = new DealCampaignService(supabase)

  router.get('/:customer_id', async (req, res, next) => {
    try {
      res.json({ ok: true, deals: await service.list(req.params.customer_id) })
    } catch (e) { next(e) }
  })

  router.post('/:customer_id', async (req, res, next) => {
    try {
      res.json({ ok: true, deal: await service.create(req.params.customer_id, req.body || {}) })
    } catch (e) { next(e) }
  })

  router.put('/:customer_id/:id', async (req, res, next) => {
    try {
      res.json({ ok: true, deal: await service.update(req.params.customer_id, req.params.id, req.body || {}) })
    } catch (e) { next(e) }
  })

  router.post('/:customer_id/:id/status', async (req, res, next) => {
    try {
      const status = String((req.body || {}).status || 'active')
      res.json({ ok: true, deal: await service.setStatus(req.params.customer_id, req.params.id, status) })
    } catch (e) { next(e) }
  })

  router.delete('/:customer_id/:id', async (req, res, next) => {
    try {
      res.json(await service.remove(req.params.customer_id, req.params.id))
    } catch (e) { next(e) }
  })

  return router
}
