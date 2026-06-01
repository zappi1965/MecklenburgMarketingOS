const express = require('express')
const { inspectCustomerSupportDiagnostics } = require('../services/supportDiagnosticsService')
const { inspectBillingConsistency } = require('../services/billingConsistencyGuardService')
const { generateMonthlyCustomerReport } = require('../services/monthlyReportGeneratorService')
const { createMonthlyReportPdf, sendMonthlyReportPdf } = require('../services/monthlyReportDeliveryService')
const { getOnboardingWorkflow, updateOnboardingStep } = require('../services/customerOnboardingWorkflowService')
const { getCustomerLifecycleStatus, setCustomerLifecycleStatus } = require('../services/customerLifecycleService')
const { listIncidents, upsertIncident } = require('../services/incidentCenterService')
const { inspectBackupRestoreReadiness, recordRestoreTest } = require('../services/backupRestoreReadinessService')
const { requirePermission } = require('../middleware/permissionGuard')

function operationsRoutes(supabase) {
  const router = express.Router()

  router.get('/support-diagnostics/:customer_id', async (req, res, next) => {
    try { res.json(await inspectCustomerSupportDiagnostics(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.get('/billing-consistency', async (req, res, next) => {
    try { res.json(await inspectBillingConsistency(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.post('/monthly-report/:customer_id', requirePermission('create_offer'), async (req, res, next) => {
    try { res.json(await generateMonthlyCustomerReport(supabase, { customer_id: req.params.customer_id, month: req.body?.month || null, save: req.body?.save !== false })) } catch (e) { next(e) }
  })

  router.post('/monthly-report/:customer_id/pdf', requirePermission('create_offer'), async (req, res, next) => {
    try { res.json(await createMonthlyReportPdf(supabase, { customer_id: req.params.customer_id, month: req.body?.month || null, save: req.body?.save !== false, actor_name: req.user?.email || 'Admin' })) } catch (e) { next(e) }
  })

  router.post('/monthly-report/:customer_id/send', requirePermission('create_offer'), async (req, res, next) => {
    try { res.json(await sendMonthlyReportPdf(supabase, { customer_id: req.params.customer_id, month: req.body?.month || null, to: req.body?.to || null, actor_name: req.user?.email || 'Admin', requireDelivery: req.body?.require_delivery !== false })) } catch (e) { next(e) }
  })

  router.get('/onboarding/:customer_id', async (req, res, next) => {
    try { res.json(await getOnboardingWorkflow(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/onboarding/:customer_id/step', requirePermission('edit_customer'), async (req, res, next) => {
    try { res.json(await updateOnboardingStep(supabase, { customer_id: req.params.customer_id, key: req.body?.key, done: req.body?.done !== false, note: req.body?.note || '', actor: req.user?.email || req.body?.actor || 'Admin' })) } catch (e) { next(e) }
  })

  router.get('/lifecycle/:customer_id', async (req, res, next) => {
    try { res.json(await getCustomerLifecycleStatus(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/lifecycle/:customer_id', requirePermission('edit_customer'), async (req, res, next) => {
    try { res.json(await setCustomerLifecycleStatus(supabase, { customer_id: req.params.customer_id, status: req.body?.status, note: req.body?.note || '', actor: req.user?.email || 'Admin' })) } catch (e) { next(e) }
  })

  router.get('/incidents', async (req, res, next) => {
    try { res.json(await listIncidents(supabase, { customer_id: req.query.customer_id || null, status: req.query.status || null })) } catch (e) { next(e) }
  })

  router.post('/incidents', requirePermission('support_ticket'), async (req, res, next) => {
    try { res.json(await upsertIncident(supabase, { ...(req.body || {}), actor: req.user?.email || req.body?.actor || 'Admin' })) } catch (e) { next(e) }
  })

  router.get('/backup-restore', async (_req, res, next) => {
    try { res.json(await inspectBackupRestoreReadiness(supabase)) } catch (e) { next(e) }
  })

  router.post('/backup-restore/restore-test', requirePermission('restore_deleted'), async (req, res, next) => {
    try { res.json(await recordRestoreTest(supabase, { status: req.body?.status || 'green', note: req.body?.note || '', actor: req.user?.email || req.body?.actor || 'Admin' })) } catch (e) { next(e) }
  })

  return router
}

module.exports = operationsRoutes
