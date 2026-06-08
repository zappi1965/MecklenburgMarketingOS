// Admin-Routen fuer das Health-Cockpit + Maintenance + Onboarding-Audit.
// Alle Routen sind Admin-only (via globalem Auth + manueller Rolle-Check).

const express = require('express')
const { collectSnapshot, persistSnapshot } = require('../services/opsHealthService')
const maintenance = require('../services/maintenanceCheckService')
const audit = require('../services/onboardingAuditService')

function ensureAdmin(req, res) {
  if (req.userRole !== 'admin') {
    res.status(403).json({ ok: false, code: 'FORBIDDEN', error: 'Admin erforderlich' })
    return false
  }
  return true
}

function opsAdminRoutes() {
  const router = express.Router()

  // === A1 — Health-Cockpit ===
  router.get('/health-snapshot', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const thresholds = {
        ticketStaleDays: Number(req.query?.tickets_stale_days) || undefined,
        slugInactiveDays: Number(req.query?.slug_inactive_days) || undefined,
        loyaltyStagnationDays: Number(req.query?.loyalty_stagnation_days) || undefined,
        highRiskScore: Number(req.query?.high_risk_score) || undefined
      }
      const data = await collectSnapshot({ thresholds })
      if (req.query?.persist === 'true') {
        await persistSnapshot({ payload: data, generated_by: req.user?.id })
      }
      res.json({ ok: true, snapshot: data })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  // === A5 — Maintenance-Alerts ===
  router.get('/maintenance-alerts', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const data = await maintenance.listOpenAlerts({
        customer_id: req.query?.customer_id || undefined,
        severity: req.query?.severity || undefined
      })
      res.json({ ok: true, alerts: data })
    } catch (e) { next(e) }
  })

  router.post('/maintenance-alerts/run', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const r = await maintenance.runAllChecks()
      res.json({ ok: true, result: r })
    } catch (e) { next(e) }
  })

  router.post('/maintenance-alerts/:id/dismiss', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const r = await maintenance.dismissAlert({ id: req.params.id })
      res.json({ ok: true, alert: r })
    } catch (e) { next(e) }
  })

  // === A2 — Onboarding-Audit ===
  router.post('/audits/start', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const r = await audit.startAudit({
        customer_id: req.body?.customer_id,
        target_url: req.body?.target_url,
        initiated_by: req.user?.id
      })
      res.json({ ok: true, audit: r })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  router.get('/audits', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const r = await audit.listAudits({ customer_id: req.query?.customer_id })
      res.json({ ok: true, audits: r })
    } catch (e) { next(e) }
  })

  router.get('/audits/:id', async (req, res, next) => {
    try {
      if (!ensureAdmin(req, res)) return
      const r = await audit.getAudit({ id: req.params.id })
      if (!r) return res.status(404).json({ ok: false, error: 'Audit nicht gefunden' })
      res.json({ ok: true, audit: r })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = opsAdminRoutes
