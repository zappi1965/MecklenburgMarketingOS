
const express = require('express')
const { z } = require('zod')
const EnterpriseService = require('../services/enterpriseService')

function enterpriseRoutes(supabase) {
  const router = express.Router()
  const service = new EnterpriseService(supabase)

  router.get('/overview', async (_, res, next) => {
    try {
      res.json({ ok: true, ...(await service.getOverview()) })
    } catch (e) { next(e) }
  })

  router.post('/events', async (req, res, next) => {
    try {
      const body = z.object({
        tenant_id: z.string().uuid().optional(),
        customer_id: z.string().uuid().optional(),
        event_type: z.string().min(1),
        title: z.string().min(1),
        payload: z.any().optional(),
        severity: z.string().optional(),
        created_by: z.string().optional()
      }).parse(req.body || {})
      res.json({ ok: true, event: await service.createEvent(body) })
    } catch (e) { next(e) }
  })

  router.post('/queue', async (req, res, next) => {
    try {
      const body = z.object({
        tenant_id: z.string().uuid().optional(),
        customer_id: z.string().uuid().optional(),
        job_type: z.string().min(1),
        priority: z.number().optional(),
        payload: z.any().optional()
      }).parse(req.body || {})
      res.json({ ok: true, job: await service.enqueueJob(body) })
    } catch (e) { next(e) }
  })

  router.post('/security-events', async (req, res, next) => {
    try {
      res.json({ ok: true, event: await service.logSecurityEvent({
        ...req.body,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      }) })
    } catch (e) { next(e) }
  })

  router.post('/backup', async (req, res, next) => {
    try {
      res.json({ ok: true, backup: await service.planBackup(req.body || {}) })
    } catch (e) { next(e) }
  })

  router.post('/feature-flags', async (req, res, next) => {
    try {
      const body = z.object({
        tenant_id: z.string().uuid().optional(),
        key: z.string().min(1),
        enabled: z.boolean(),
        config: z.any().optional()
      }).parse(req.body || {})
      res.json({ ok: true, flag: await service.setFeatureFlag(body) })
    } catch (e) { next(e) }
  })

  router.post('/run-preset/:preset', async (req, res, next) => {
    try {
      const preset = req.params.preset
      const map = {
        security_check: { job_type: 'security_check', title: 'Security Check gestartet' },
        backup_snapshot: { job_type: 'backup_snapshot', title: 'Backup Restore Point geplant' },
        tenant_audit: { job_type: 'tenant_audit', title: 'Mandantenprüfung gestartet' },
        queue_retry: { job_type: 'retry_failed_jobs', title: 'Retry-Lauf gestartet' },
        report_pack: { job_type: 'report_pack', title: 'Report-Paket geplant' }
      }
      const selected = map[preset] || { job_type: preset, title: `Enterprise Job gestartet: ${preset}` }
      const job = await service.enqueueJob({ job_type: selected.job_type, payload: req.body || {} })
      const event = await service.createEvent({
        event_type: 'preset_started',
        title: selected.title,
        payload: { preset, job_id: job.id },
        severity: 'success',
        created_by: 'Admin'
      })
      res.json({ ok: true, job, event })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = enterpriseRoutes
