const express = require('express')
const { DemoEnvironmentService } = require('../services/demoEnvironmentService')

function demoEnvironmentRoutes(supabase) {
  const router = express.Router()
  const service = new DemoEnvironmentService(supabase)

  router.get('/dashboard', async (req, res, next) => {
    try { res.json({ ok: true, demo: await service.dashboard() }) } catch (e) { next(e) }
  })

  router.post('/check', async (req, res, next) => {
    try { res.json({ ok: true, result: await service.check() }) } catch (e) { next(e) }
  })

  router.get('/customer-id', (req, res) => {
    res.json({ ok: true, customer_id: service.demoCustomerId })
  })

  return router
}

module.exports = demoEnvironmentRoutes
