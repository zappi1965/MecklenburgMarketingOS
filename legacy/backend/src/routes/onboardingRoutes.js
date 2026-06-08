const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const svc = require('../services/onboardingService')

function onboardingRoutes() {
  const router = express.Router()

  router.get('/status/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await svc.getStatus(req.params.customer_id)
      res.json({ ok: true, ...data, all_steps: svc.STEPS })
    } catch (e) { next(e) }
  })

  router.post('/brand/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const next = await svc.saveBrand({ customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, onboarding: next })
    } catch (e) { next(e) }
  })

  router.post('/qr/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await svc.createFirstQr({ customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, campaign: data })
    } catch (e) { next(e) }
  })

  router.post('/loyalty/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await svc.createFirstLoyalty({ customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, ...data })
    } catch (e) { next(e) }
  })

  router.post('/samples/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await svc.seedSamples({ customer_id: req.params.customer_id })
      res.json({ ok: true, onboarding: data })
    } catch (e) { next(e) }
  })

  router.post('/complete/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await svc.complete({ customer_id: req.params.customer_id })
      res.json({ ok: true, onboarding: data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = onboardingRoutes
