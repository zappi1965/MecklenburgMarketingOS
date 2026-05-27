const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const dupService = require('../services/duplicateFinderService')
const validationService = require('../services/validationService')
const aiReviewResponseService = require('../services/aiReviewResponseService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function dataQualityRoutes() {
  const router = express.Router()

  // Dublettensuche (Admin-only — globaler Scan ueber alle customers).
  router.get('/duplicates', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const threshold = Number(req.query.threshold || 0.8)
      const limit = Math.min(2000, Number(req.query.limit || 500))
      const clusters = await dupService.findDuplicates({ threshold, limit })
      res.json({ ok: true, clusters })
    } catch (e) { next(e) }
  })

  router.post('/duplicates/merge', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const result = await dupService.mergeDuplicates({
        primary_id: req.body?.primary_id,
        merge_ids: req.body?.merge_ids,
        actor_id: req.user?.id
      })
      res.json({ ok: true, result })
    } catch (e) { next(e) }
  })

  // Einzel-Validierung E-Mail (kein customer_id Bezug noetig).
  router.post('/validate/email', async (req, res, next) => {
    try {
      const r = await validationService.validateEmail(req.body?.email)
      res.json({ ok: true, validation: r })
    } catch (e) { next(e) }
  })

  // Adress-Komplett-Validierung fuer einen Customer.
  router.post('/validate/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await validationService.validateAndStoreCustomer(req.params.customer_id)
      res.json({ ok: true, result: r })
    } catch (e) { next(e) }
  })

  // AI-Review-Response-Generator.
  router.post('/ai/review-response', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const reviewId = String(req.body?.review_feedback_id || '')
      const supabase = getSupabaseAdmin()
      if (!reviewId || !supabase) { return res.status(400).json({ ok: false, error: 'review_feedback_id fehlt' }) }
      const { data: review } = await supabase
        .from('review_feedback')
        .select('id, customer_id, rating, feedback_text')
        .eq('id', reviewId)
        .maybeSingle()
      if (!review) return res.status(404).json({ ok: false, error: 'Review nicht gefunden' })
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, brand_voice, metadata')
        .eq('id', review.customer_id)
        .maybeSingle()
      const r = await aiReviewResponseService.generateResponses({ review, customer })
      res.json({ ok: true, ...r })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = dataQualityRoutes
