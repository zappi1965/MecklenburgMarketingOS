// Kundenscoped Routes für "Deal der Woche" / Aktionen.
const express = require('express')
const { DealCampaignService } = require('../services/dealCampaignService')
const { dealCreateSchema, dealUpdateSchema, parseOrThrow } = require('../validators/marketingSchemas')
const { captureToolError } = require('../lib/toolObservability')

function fail(res, e, ctx) {
  if (!e.status || e.status >= 500) captureToolError(e, ctx)
  res.status(e.status || 500).json({ ok: false, error: e.message, code: e.code })
}

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
      const body = parseOrThrow(dealCreateSchema, req.body)
      res.json({ ok: true, deal: await service.create(req.params.customer_id, body) })
    } catch (e) { fail(res, e, { tool: 'deal_of_week', action: 'create', customer_id: req.params.customer_id }) }
  })

  router.put('/:customer_id/:id', async (req, res, next) => {
    try {
      const body = parseOrThrow(dealUpdateSchema, req.body)
      res.json({ ok: true, deal: await service.update(req.params.customer_id, req.params.id, body) })
    } catch (e) { fail(res, e, { tool: 'deal_of_week', action: 'update', customer_id: req.params.customer_id }) }
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
