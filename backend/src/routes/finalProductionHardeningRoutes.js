const express = require('express')
const { runProductionSmokeTest } = require('../services/productionSmokeTestService')
const { registerDefaultJobs, listJobs, runJob, runAllJobs } = require('../services/backgroundJobSchedulerService')
const { inspectTenantIsolation } = require('../services/tenantIsolationAuditService')
const { inspectWebhookSignatureConfig } = require('../services/webhookSignatureGuardService')
const { inspectUploadConfig, inspectFileUpload } = require('../services/fileUploadSecurityGuardService')
const { matrix, inspectRole } = require('../services/rbacPermissionMatrixService')
const { inspectMailComplianceTemplates } = require('../services/mailComplianceTemplateVersioningService')
const { inspectProductionErrors } = require('../services/productionErrorCenterService')
const { inspectCustomerGoLiveChecklist } = require('../services/customerGoLiveChecklistService')
const { inspectDataQualityRules } = require('../services/dataQualityRulesEngineService')
const { inspectDocumentIntegrity } = require('../services/documentIntegrityService')
const { qrEndToEndDiagnostic } = require('../services/qrMaintenanceService')
const { final99ActivationReadiness, recordFinal99Verification } = require('../services/final99ActivationService')

let registeredFor = null

function ensureJobs(supabase) {
  if (registeredFor !== supabase) {
    registerDefaultJobs(supabase)
    registeredFor = supabase
  }
}

function finalProductionHardeningRoutes(supabase) {
  const router = express.Router()

  router.get('/overview', async (req, res, next) => {
    try {
      ensureJobs(supabase)
      const customer_id = req.query.customer_id || null
      const [smoke, tenant, webhook, upload, mail, errors, dataQuality, docs, qr, goLive, activation] = await Promise.all([
        runProductionSmokeTest(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message })),
        inspectTenantIsolation(supabase).catch((e) => ({ ok:false, error:e.message })),
        Promise.resolve(inspectWebhookSignatureConfig()),
        Promise.resolve(inspectUploadConfig()),
        inspectMailComplianceTemplates(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message })),
        inspectProductionErrors(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message })),
        inspectDataQualityRules(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        inspectDocumentIntegrity(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        qrEndToEndDiagnostic(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, checks: [] })),
        customer_id ? inspectCustomerGoLiveChecklist(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, checklist: [] })) : Promise.resolve(null),
        final99ActivationReadiness(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, missing: [] }))
      ])
      const blocks = { smoke, tenant, webhook, upload, mail, errors, data_quality: dataQuality, documents: docs, qr, go_live: goLive, activation }
      const values = Object.values(blocks).filter(Boolean)
      const score = Math.round(values.filter((v) => v.ok !== false).length / Math.max(1, values.length) * 100)
      res.json({ ok: score >= 90, score, customer_id, blocks, jobs: listJobs(), rbac: matrix(), checked_at: new Date().toISOString() })
    } catch (e) { next(e) }
  })

  router.get('/activation-readiness', async (req, res, next) => {
    try { res.json(await final99ActivationReadiness(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.post('/activation-readiness/verify', async (req, res, next) => {
    try { res.json(await recordFinal99Verification(supabase, { key: req.body?.key, status: req.body?.status || 'green', note: req.body?.note || '', actor: req.body?.actor || req.user?.email || 'Admin' })) } catch (e) { next(e) }
  })

  router.get('/smoke', async (req, res, next) => {
    try { res.json(await runProductionSmokeTest(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/tenant-isolation', async (_req, res, next) => {
    try { res.json(await inspectTenantIsolation(supabase)) } catch (e) { next(e) }
  })

  router.get('/webhooks', (_req, res) => res.json(inspectWebhookSignatureConfig()))

  router.get('/upload-policy', (_req, res) => res.json(inspectUploadConfig()))

  router.post('/upload/inspect', (req, res) => res.json(inspectFileUpload(req.body || {})))

  router.get('/rbac/matrix', (_req, res) => res.json(matrix()))

  router.get('/rbac/role/:role', (req, res) => res.json(inspectRole(req.params.role)))

  router.get('/mail-compliance', async (req, res, next) => {
    try { res.json(await inspectMailComplianceTemplates(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/errors', async (req, res, next) => {
    try { res.json(await inspectProductionErrors(supabase, { customer_id: req.query.customer_id || null, limit: req.query.limit || 100 })) } catch (e) { next(e) }
  })

  router.get('/jobs', (_req, res) => {
    ensureJobs(supabase)
    res.json({ ok: true, jobs: listJobs() })
  })

  router.post('/jobs/:key/run', async (req, res, next) => {
    try {
      ensureJobs(supabase)
      res.json(await runJob(req.params.key))
    } catch (e) { next(e) }
  })

  router.post('/jobs/run-all', async (_req, res, next) => {
    try {
      ensureJobs(supabase)
      res.json(await runAllJobs())
    } catch (e) { next(e) }
  })

  return router
}

module.exports = finalProductionHardeningRoutes
