const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const apiKey = require('../services/apiKeyService')

function apiKeyRoutes() {
  const router = express.Router()

  router.get('/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await apiKey.listKeys(req.params.customer_id)
      res.json({ ok: true, keys: data })
    } catch (e) { next(e) }
  })

  router.post('/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await apiKey.createKey({
        customer_id: req.params.customer_id,
        name: req.body?.name,
        scopes: req.body?.scopes || [],
        created_by: req.user?.id
      })
      // fullKey wird hier EINMALIG geliefert.
      res.json({ ok: true, key: data })
    } catch (e) { next(e) }
  })

  router.post('/customer/:customer_id/:id/revoke', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await apiKey.revokeKey({ id: req.params.id, customer_id: req.params.customer_id })
      res.json({ ok: true, key: data })
    } catch (e) { next(e) }
  })

  router.get('/scopes', (req, res) => {
    res.json({ ok: true, scopes: apiKey.VALID_SCOPES })
  })

  return router
}

module.exports = apiKeyRoutes
