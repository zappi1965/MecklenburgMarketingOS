const express = require('express')
const { migrateQrLegacyTargets, cleanupQrScanTokens, qrEndToEndDiagnostic } = require('../services/qrMaintenanceService')
const { inspectCustomerPortalPermissions } = require('../services/customerPortalPermissionGuardService')
const { inspectDataQualityRules } = require('../services/dataQualityRulesEngineService')
const { inspectMailDeliveryGuard } = require('../services/mailDeliveryGuardService')
const { inspectBookingConsistency } = require('../services/bookingConsistencyGuardService')
const { inspectDocumentVersioningGuard } = require('../services/documentVersioningGuardService')
const { inspectAuditOfferConsistency } = require('../services/auditOfferConsistencyService')
const { inspectAdminRbacGuard } = require('../services/adminRbacGuardService')
const { inspectCustomerGoLiveChecklist } = require('../services/customerGoLiveChecklistService')
const { listTrash, restoreItem } = require('../services/trashRestoreService')
const { inspectDocumentIntegrity } = require('../services/documentIntegrityService')
const { inspectSchemaMigrationDoctor } = require('../services/schemaMigrationDoctorService')
const { publicShieldStatus } = require('../services/publicEndpointShieldService')

function customerReadinessRoutes(supabase) {
  const router = express.Router()

  router.get('/overview', async (req, res, next) => {
    try {
      const customer_id = req.query.customer_id || null
      const [schema, docs, data, mail, booking, versioning, auditOffer, rbac, trash, qr] = await Promise.all([
        inspectSchemaMigrationDoctor(supabase).catch((e) => ({ ok:false, error:e.message })),
        inspectDocumentIntegrity(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        inspectDataQualityRules(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        Promise.resolve(inspectMailDeliveryGuard()),
        inspectBookingConsistency(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        inspectDocumentVersioningGuard(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        inspectAuditOfferConsistency(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        inspectAdminRbacGuard(supabase).catch((e) => ({ ok:false, error:e.message, issues: [] })),
        listTrash(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, items: [] })),
        qrEndToEndDiagnostic(supabase, { customer_id }).catch((e) => ({ ok:false, error:e.message, checks: [] }))
      ])
      res.json({ ok: true, customer_id, schema, documents: docs, data_quality: data, mail, booking, document_versioning: versioning, audit_offer: auditOffer, admin_rbac: rbac, trash, qr, public_shield: publicShieldStatus() })
    } catch (e) { next(e) }
  })

  router.get('/go-live/:customer_id', async (req, res, next) => {
    try { res.json(await inspectCustomerGoLiveChecklist(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.get('/portal-permissions/:customer_id', async (req, res, next) => {
    try { res.json(await inspectCustomerPortalPermissions(supabase, { customer_id: req.params.customer_id, user_id: req.query.user_id || null, tool_key: req.query.tool_key || null })) } catch (e) { next(e) }
  })

  router.get('/data-quality', async (req, res, next) => {
    try { res.json(await inspectDataQualityRules(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/mail', (_req, res) => res.json(inspectMailDeliveryGuard()))

  router.get('/booking', async (req, res, next) => {
    try { res.json(await inspectBookingConsistency(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/documents/versioning', async (req, res, next) => {
    try { res.json(await inspectDocumentVersioningGuard(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/audit-offer', async (req, res, next) => {
    try { res.json(await inspectAuditOfferConsistency(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/admin-rbac', async (_req, res, next) => {
    try { res.json(await inspectAdminRbacGuard(supabase)) } catch (e) { next(e) }
  })

  router.get('/trash', async (req, res, next) => {
    try { res.json(await listTrash(supabase, { customer_id: req.query.customer_id || null, table: req.query.table || null })) } catch (e) { next(e) }
  })

  router.post('/trash/restore', async (req, res, next) => {
    try { res.json(await restoreItem(supabase, { table: req.body?.table, id: req.body?.id })) } catch (e) { next(e) }
  })

  router.post('/qr/migrate-legacy-targets', async (req, res, next) => {
    try { res.json(await migrateQrLegacyTargets(supabase, { customer_id: req.body?.customer_id || null, dry_run: req.body?.dry_run === true })) } catch (e) { next(e) }
  })

  router.post('/qr/cleanup-tokens', async (req, res, next) => {
    try { res.json(await cleanupQrScanTokens(supabase, req.body || {})) } catch (e) { next(e) }
  })

  router.get('/qr/e2e', async (req, res, next) => {
    try { res.json(await qrEndToEndDiagnostic(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  return router
}

module.exports = customerReadinessRoutes
