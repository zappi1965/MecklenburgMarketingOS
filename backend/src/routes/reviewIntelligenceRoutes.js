const express = require('express')
const { ReviewIntelligenceService } = require('../services/reviewIntelligenceService')

function reviewIntelligenceRoutes(supabase) {
  const router = express.Router()
  const service = new ReviewIntelligenceService(supabase)

  router.post('/analyze-review/:review_id', async (req, res, next) => {
    try {
      const { data: review, error } = await supabase
        .from('review_feedback')
        .select('*')
        .eq('id', req.params.review_id)
        .single()

      if (error) throw error

      res.json({
        ok: true,
        item: await service.analyzeReview(review),
      })
    } catch (e) {
      next(e)
    }
  })

  router.post('/analyze-customer/:customer_id', async (req, res, next) => {
    try {
      res.json({
        ok: true,
        profile: await service.analyzeCustomer(req.params.customer_id),
      })
    } catch (e) {
      next(e)
    }
  })

  router.post('/rebuild-profile/:customer_id', async (req, res, next) => {
    try {
      res.json({
        ok: true,
        profile: await service.rebuildProfile(req.params.customer_id),
      })
    } catch (e) {
      next(e)
    }
  })

  router.get('/profile/:customer_id', async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('review_intelligence_profiles')
        .select('*')
        .eq('customer_id', req.params.customer_id)
        .maybeSingle()

      if (error) throw error

      res.json({
        ok: true,
        profile: data,
      })
    } catch (e) {
      next(e)
    }
  })

  router.get('/items/:customer_id', async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('review_intelligence_items')
        .select('*')
        .eq('customer_id', req.params.customer_id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      res.json({
        ok: true,
        items: data || [],
      })
    } catch (e) {
      next(e)
    }
  })

  router.get('/topics', async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('review_topic_dictionary')
        .select('*')
        .eq('active', true)
        .order('topic_type', { ascending: true })

      if (error) throw error

      res.json({
        ok: true,
        topics: data || [],
      })
    } catch (e) {
      next(e)
    }
  })

  router.post('/topics', async (req, res, next) => {
    try {
      res.json({
        ok: true,
        topic: await service.createTopic(req.body || {}),
      })
    } catch (e) {
      next(e)
    }
  })

  // Express 5 / path-to-regexp compatibility:
  // Alte Schreibweise '/templates/:customer_id?' crasht auf Railway.
  // Deshalb sauber auf zwei explizite Routen aufgeteilt.
  const getTemplatesHandler = async (req, res, next) => {
    try {
      res.json({
        ok: true,
        templates: await service.templates(req.params.customer_id || null),
      })
    } catch (e) {
      next(e)
    }
  }

  router.get('/templates', getTemplatesHandler)
  router.get('/templates/:customer_id', getTemplatesHandler)

  router.post('/templates', async (req, res, next) => {
    try {
      res.json({
        ok: true,
        template: await service.createTemplate(req.body || {}),
      })
    } catch (e) {
      next(e)
    }
  })

  return router
}

module.exports = reviewIntelligenceRoutes
