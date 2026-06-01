const express = require('express')
const { goLiveCockpitOverview } = require('../services/goLiveCockpitService')

function goLiveCockpitRoutes(supabase) {
  const router = express.Router()
  router.get('/overview', async (req, res, next) => {
    try { res.json(await goLiveCockpitOverview(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })
  return router
}

module.exports = goLiveCockpitRoutes
