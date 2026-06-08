const express = require('express')
const { isAdmin, requestUser } = require('../services/permissionService')

async function hasTable(supabase, table) {
  try {
    const { error } = await supabase.from(table).select('*').limit(1)
    return !error
  } catch (_) { return false }
}

async function hasBucket(supabase, bucket) {
  try {
    const { data } = await supabase.storage.listBuckets()
    return Boolean((data || []).find((b) => b.name === bucket))
  } catch (_) { return false }
}

module.exports = function securityCoreRoutes(supabase) {
  const router = express.Router()

  router.get('/health', async (req, res, next) => {
    try {
      const user = requestUser(req)
      if (!isAdmin(user)) return res.status(403).json({ ok: false, code: 'ADMIN_REQUIRED', error: 'Nur Admin' })
      const requiredTables = [
        'job_queue',
        'idempotency_keys',
        'output_documents',
        'customer_files',
        'admin_audit_logs',
        'api_usage_events',
        'backup_runs'
      ]
      const tables = {}
      for (const table of requiredTables) tables[table] = await hasTable(supabase, table)
      const bucketName = process.env.MMOS_DOCUMENT_BUCKET || process.env.SUPABASE_DOCUMENT_BUCKET || 'generated-pdfs'
      const buckets = { [bucketName]: await hasBucket(supabase, bucketName) }
      const env = {
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        GOTENBERG_URL: Boolean(process.env.GOTENBERG_URL),
        GOOGLE_PLACES_API_KEY: Boolean(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
        SENTRY_DSN: Boolean(process.env.SENTRY_DSN),
        MMOS_DOCUMENT_BUCKET: Boolean(process.env.MMOS_DOCUMENT_BUCKET || process.env.SUPABASE_DOCUMENT_BUCKET)
      }
      const ok = Object.values(tables).every(Boolean) && Object.values(buckets).every(Boolean)
      res.json({ ok, env, tables, buckets, timestamp: new Date().toISOString() })
    } catch (error) { next(error) }
  })

  router.get('/permissions/self-test', async (req, res) => {
    const user = requestUser(req)
    res.json({ ok: true, user: { role: user.role, status: user.status, customer_id: user.customer_id }, admin: isAdmin(user) })
  })

  return router
}
