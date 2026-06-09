const express = require('express')
const {
  inspectMailDomainReadiness,
  sendLiveTestMail,
  createUnsubscribeLiveTest,
  privacyMarketingReminderText,
  finalLegalChecklist
} = require('../services/mailDomainLiveReadinessService')
const { requirePermission } = require('../middleware/permissionGuard')

function mailDomainComplianceRoutes(supabase) {
  const router = express.Router()

  router.get('/readiness', async (req, res, next) => {
    try { res.json(await inspectMailDomainReadiness({ domain: req.query.domain || null })) } catch (e) { next(e) }
  })

  router.post('/test-mail', requirePermission('manage_retention'), async (req, res, next) => {
    try { res.json(await sendLiveTestMail(supabase, { to: req.body?.to, subject: req.body?.subject, requireDelivery: req.body?.require_delivery !== false })) } catch (e) { next(e) }
  })

  router.post('/unsubscribe-self-test', requirePermission('manage_retention'), async (req, res, next) => {
    try { res.json(await createUnsubscribeLiveTest(supabase, { customer_id: req.body?.customer_id, email: req.body?.email, slug: req.body?.slug, member_id: req.body?.member_id })) } catch (e) { next(e) }
  })

  router.get('/privacy-reminder-text', (_req, res) => {
    res.json({ ok: true, privacy: privacyMarketingReminderText() })
  })

  router.get('/legal-checklist', (_req, res) => {
    res.json({ ok: true, checklist: finalLegalChecklist() })
  })

  return router
}

module.exports = mailDomainComplianceRoutes
