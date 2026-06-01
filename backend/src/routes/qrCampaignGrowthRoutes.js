const express = require('express')
const {
  PLACEMENTS,
  CAMPAIGN_TYPES,
  listQrGrowthOverview,
  createPlacementVariants,
  recordQrFunnelEvent,
  createPrintPackage,
  recommendQrOptimizations
} = require('../services/qrCampaignGrowthService')
const { requirePermission } = require('../middleware/permissionGuard')

function qrCampaignGrowthRoutes(supabase) {
  const router = express.Router()

  router.get('/templates', (_req, res) => {
    res.json({ ok: true, placements: PLACEMENTS, campaign_types: CAMPAIGN_TYPES })
  })

  router.get('/overview/:customer_id', async (req, res, next) => {
    try { res.json(await listQrGrowthOverview(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/placements/:customer_id', requirePermission('manage_qr'), async (req, res, next) => {
    try {
      res.json(await createPlacementVariants(supabase, {
        customer_id: req.params.customer_id,
        parent_qr_campaign_id: req.body?.parent_qr_campaign_id || null,
        campaign_type: req.body?.campaign_type || 'loyalty',
        placements: Array.isArray(req.body?.placements) ? req.body.placements : [],
        title: req.body?.title || null
      }))
    } catch (e) { next(e) }
  })

  router.post('/event', async (req, res, next) => {
    try { res.json(await recordQrFunnelEvent(supabase, req.body || {})) } catch (e) { next(e) }
  })

  router.post('/print-package/:customer_id/:qr_campaign_id', requirePermission('manage_qr'), async (req, res, next) => {
    try {
      res.json(await createPrintPackage(supabase, {
        customer_id: req.params.customer_id,
        qr_campaign_id: req.params.qr_campaign_id,
        formats: Array.isArray(req.body?.formats) ? req.body.formats : undefined,
        brand: req.body?.brand || {}
      }))
    } catch (e) { next(e) }
  })

  router.get('/recommendations/:customer_id', async (req, res, next) => {
    try { res.json(await recommendQrOptimizations(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  return router
}

module.exports = qrCampaignGrowthRoutes
