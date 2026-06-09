const express = require('express')
const {
  strictTenantAudit,
  customerPortalLiveCheck,
  validatePackageToolAccess,
  validateToolAccessProbe,
  documentDeepValidation,
  eInvoiceDeepValidation,
  backupRestorePracticalCheck,
  finalAcceptanceCheck
} = require('../services/finalHardeningService')
const { sendMonitoringAlert } = require('../services/monitoringAlertService')

function requireAdmin(req) {
  if (req.userRole !== 'admin') {
    const e = new Error('Nur Adminzugriff.')
    e.status = 403
    e.code = 'ADMIN_REQUIRED'
    throw e
  }
}

function finalHardeningRoutes(supabase) {
  const router = express.Router()

  router.get('/final-hardening/rls', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await strictTenantAudit(supabase))
    } catch (e) { next(e) }
  })

  router.get('/final-hardening/customer/:customer_id', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await customerPortalLiveCheck(supabase, req.params.customer_id))
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/package-access', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await validatePackageToolAccess(supabase, req.body.customer_id, {
        sync: Boolean(req.body.sync),
        actor_name: req.user?.email || req.user?.id || 'Admin'
      }))
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/tool-access-probe', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await validateToolAccessProbe(supabase, req.body || {}))
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/documents', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await documentDeepValidation(supabase, req.body.customer_id))
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/e-invoice', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await eInvoiceDeepValidation(supabase, req.body.customer_id))
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/backup-restore', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await backupRestorePracticalCheck(supabase))
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/monitoring-alert', async (req, res, next) => {
    try {
      requireAdmin(req)
      const result = await sendMonitoringAlert(supabase, {
        level: req.body.level || 'test',
        title: req.body.title || 'MMOS Final Hardening Test',
        message: req.body.message || 'Monitoring-Test aus Final Hardening erfolgreich ausgelöst.',
        to: req.body.to,
        metadata: { source: 'final-hardening', actor: req.user?.email || req.user?.id || null }
      })
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/final-hardening/acceptance', async (req, res, next) => {
    try {
      requireAdmin(req)
      res.json(await finalAcceptanceCheck(supabase, req.body.customer_id || req.body.customerId))
    } catch (e) { next(e) }
  })

  return router
}

module.exports = finalHardeningRoutes
