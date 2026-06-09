const express = require('express')
const { enqueueJob, getJob } = require('../services/jobQueueService')
const { renderAndStoreDocument, getDocumentSignedUrl } = require('../services/documentEngineV2Service')
const { assertCan, requestUser, scopedCustomerFilter } = require('../services/permissionService')
const { writeAdminLog } = require('../services/adminActionLogService')

module.exports = function documentEngineV2Routes(supabase) {
  const router = express.Router()

  router.post('/documents/render-sync', async (req, res, next) => {
    try {
      const result = await renderAndStoreDocument(supabase, req, req.body || {})
      await writeAdminLog(supabase, req, { action: 'document.render_sync', resource_type: 'document_generation', customer_id: result.customer_id, resource_id: result.document_id, metadata: { document_type: result.document_type } })
      res.json(result)
    } catch (error) { next(error) }
  })

  router.post('/jobs/document', async (req, res, next) => {
    try {
      const user = requestUser(req)
      const customer_id = req.body?.customer_id || req.body?.customerId
      assertCan(user, 'generate', 'document_generation', { customer_id })
      const job = await enqueueJob(supabase, {
        type: 'document_engine_v2.render',
        payload: req.body || {},
        customer_id,
        actor_user_id: user.id,
        idempotency_key: req.body?.idempotency_key || req.body?.idempotencyKey || null
      })
      await writeAdminLog(supabase, req, { action: 'job.enqueue_document', resource_type: 'job_queue', customer_id, resource_id: job.id })
      res.json({ ok: true, job })
    } catch (error) { next(error) }
  })

  router.get('/jobs/:id', async (req, res, next) => {
    try {
      const job = await getJob(supabase, req.params.id)
      if (!job) return res.status(404).json({ ok: false, code: 'JOB_NOT_FOUND', error: 'Job nicht gefunden' })
      const user = requestUser(req)
      if (job.customer_id) scopedCustomerFilter(user, job.customer_id)
      res.json({ ok: true, job })
    } catch (error) { next(error) }
  })

  router.get('/documents/:id/signed-url', async (req, res, next) => {
    try {
      res.json(await getDocumentSignedUrl(supabase, req, req.params.id))
    } catch (error) { next(error) }
  })

  return router
}
