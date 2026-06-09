const express = require('express')
const {
  SEGMENT_TEMPLATES,
  ACTION_TEMPLATES,
  calculateRetentionIntelligence,
  createSegmentsFromTemplates,
  generateFeedbackActionBoard,
  createServiceRecoveryCase,
  createReactivationPlan
} = require('../services/retentionIntelligenceSuiteService')
const { requirePermission } = require('../middleware/permissionGuard')
const { generateMarketingReminderDrafts, sendMarketingReminderDrafts } = require('../services/marketingReminderAutomationService')
const { inspectMarketingConsentWording } = require('../services/marketingConsentComplianceService')
const { startSegmentBasedCampaign } = require('../services/retentionSegmentCampaignService')

function retentionIntelligenceRoutes(supabase) {
  const router = express.Router()

  router.get('/templates', (_req, res) => {
    res.json({ ok: true, segments: SEGMENT_TEMPLATES, actions: ACTION_TEMPLATES })
  })

  router.post('/marketing-consent/legal-review', requirePermission('manage_loyalty'), async (req, res) => {
    res.json(inspectMarketingConsentWording(req.body || {}))
  })

  router.get('/overview/:customer_id', async (req, res, next) => {
    try { res.json(await calculateRetentionIntelligence(supabase, { customer_id: req.params.customer_id, persist: req.query.persist === 'true' })) } catch (e) { next(e) }
  })

  router.post('/segments/:customer_id/create-defaults', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createSegmentsFromTemplates(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/feedback-actions/:customer_id/generate', requirePermission('support_ticket'), async (req, res, next) => {
    try { res.json(await generateFeedbackActionBoard(supabase, { customer_id: req.params.customer_id, persist: req.body?.persist !== false })) } catch (e) { next(e) }
  })

  router.post('/service-recovery/:customer_id', requirePermission('support_ticket'), async (req, res, next) => {
    try { res.json(await createServiceRecoveryCase(supabase, { ...(req.body || {}), customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/reactivation-plan/:customer_id', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createReactivationPlan(supabase, { customer_id: req.params.customer_id, persist: req.body?.persist !== false })) } catch (e) { next(e) }
  })

  router.post('/segment-campaign/:customer_id/start', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await startSegmentBasedCampaign(supabase, { customer_id: req.params.customer_id, segment_key: req.body?.segment_key, title: req.body?.title || null, create_coupons: req.body?.create_coupons === true, coupon_value: req.body?.coupon_value || '10%', actor: req.user?.email || 'Admin' })) } catch (e) { next(e) }
  })

  router.post('/marketing-reminders/:customer_id/generate', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await generateMarketingReminderDrafts(supabase, { customer_id: req.params.customer_id, persist: req.body?.persist !== false })) } catch (e) { next(e) }
  })

  router.post('/marketing-reminders/:customer_id/send', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await sendMarketingReminderDrafts(supabase, { customer_id: req.params.customer_id, draft_ids: req.body?.draft_ids || [], requireDelivery: req.body?.require_delivery !== false, limit: req.body?.limit || 50 })) } catch (e) { next(e) }
  })

  return router
}

module.exports = retentionIntelligenceRoutes
