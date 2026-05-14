
const express = require('express')
const { missingEnv } = require('../utils/env')

function systemRoutes(supabaseAdmin) {
  const router = express.Router()

  router.get('/health', (_, res) => {
    res.json({
      ok: true,
      service: 'MMOS Core Backend',
      time: new Date().toISOString(),
      supabase: Boolean(supabaseAdmin),
      missing_env: missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
    })
  })

  router.get('/ready', async (_, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
    }

    const { error } = await supabaseAdmin.from('customers').select('id').limit(1)
    if (error) return res.status(503).json({ ok: false, error: error.message })

    res.json({ ok: true, ready: true })
  })

  return router
}

module.exports = systemRoutes
