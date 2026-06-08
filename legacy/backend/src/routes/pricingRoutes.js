const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const pricing = require('../services/pricingService')

function pricingRoutes() {
  const router = express.Router()

  router.get('/rules/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await pricing.listRules({ customer_id: req.params.customer_id, scope: req.query?.scope })
      res.json({ ok: true, rules: data })
    } catch (e) { next(e) }
  })

  router.post('/rules/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await pricing.upsertRule({ customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, rule: data })
    } catch (e) { next(e) }
  })

  router.delete('/rules/:customer_id/:id', requireCustomerAccess(), async (req, res, next) => {
    try {
      await pricing.deleteRule({ id: req.params.id, customer_id: req.params.customer_id })
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  router.post('/calculate/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await pricing.calculatePrice({
        customer_id: req.params.customer_id,
        scope: req.body?.scope,
        scope_value: req.body?.scope_value,
        occupancy: req.body?.occupancy,
        slot_time: req.body?.slot_time
      })
      res.json({ ok: true, ...r })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = pricingRoutes
