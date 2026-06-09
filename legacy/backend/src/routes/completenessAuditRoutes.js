const express = require('express')
const { buildCompletenessAudit, recordCompletenessProof } = require('../services/completenessAuditService')

function completenessAuditRoutes(supabase) {
  const router = express.Router()

  router.get('/overview', async (req, res, next) => {
    try {
      res.json(buildCompletenessAudit({ customer_id: req.query.customer_id || null }))
    } catch (e) { next(e) }
  })

  router.post('/proof', async (req, res, next) => {
    try {
      res.json(await recordCompletenessProof(supabase, {
        key: req.body?.key,
        status: req.body?.status || 'green',
        note: req.body?.note || '',
        actor: req.user?.email || req.body?.actor || 'Admin'
      }))
    } catch (e) { next(e) }
  })

  return router
}

module.exports = completenessAuditRoutes
