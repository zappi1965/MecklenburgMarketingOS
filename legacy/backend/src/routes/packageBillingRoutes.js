
const express = require('express')
const PackageBillingService = require('../services/packageBillingService')

function packageBillingRoutes(supabase) {
  const router = express.Router()
  const service = new PackageBillingService(supabase)

  router.get('/catalog', async (_, res, next) => {
    try { res.json({ ok:true, packages: await service.catalog() }) } catch(e){ next(e) }
  })

  router.get('/customer/:customer_id/tools', async (req, res, next) => {
    try { res.json({ ok:true, ...(await service.allowedTools(req.params.customer_id)) }) } catch(e){ next(e) }
  })

  router.post('/request', async (req, res, next) => {
    try { res.json({ ok:true, request: await service.requestPackage(req.body || {}) }) } catch(e){ next(e) }
  })

  router.post('/grant', async (req, res, next) => {
    try { res.json({ ok:true, subscription: await service.grantPackage(req.body || {}) }) } catch(e){ next(e) }
  })

  return router
}
module.exports = packageBillingRoutes
