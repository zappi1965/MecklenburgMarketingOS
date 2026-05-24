const express = require('express')
const GoogleApiService = require('../services/googleApiService')
const ApiSyncService = require('../services/apiSyncService')

function normalizeProvider(provider = '') {
  const normalized = ApiSyncService.normalizeProvider(provider)
  return normalized === 'google_business' ? 'google-business' : normalized === 'search_console' ? 'search-console' : normalized
}

async function recordSyncStatus(supabase, customerId, provider, status, error, extra = {}) {
  if (!supabase || !customerId) return
  const patch = {
    status,
    provider,
    last_sync_at: new Date().toISOString(),
    last_sync_status: status,
    last_sync_error: error || null,
    metadata: extra
  }
  try {
    await supabase
      .from('integrations')
      .update(patch)
      .eq('customer_id', customerId)
      .or(`provider.eq.${provider},name.ilike.%${provider}%`)
  } catch (_) {}
  try {
    await supabase.from('activity_logs').insert({
      customer_id: customerId,
      actor_name: 'System',
      action: `integration_sync_${status}`,
      message: error ? `${provider}: ${error}` : `${provider}: Sync ${status}`,
      metadata: patch
    })
  } catch (_) {}
}

function googleRoutes(supabase) {
  const router = express.Router()
  const google = new GoogleApiService(supabase)
  const sync = new ApiSyncService(supabase)

  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'MMOS Google Integration Router',
      google_oauth_configured: google.enabled,
      missing_env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'].filter((key) => !process.env[key]),
      providers: ['google-business', 'search-console', 'analytics', 'meta']
    })
  })

  router.get('/auth-url/:customer_id', (req, res, next) => {
    try {
      if (!google.enabled) {
        return res.status(503).json({
          ok: false,
          code: 'GOOGLE_OAUTH_ENV_MISSING',
          error: 'Google OAuth ENV fehlt.',
          missing_env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'].filter((key) => !process.env[key]),
          hint: 'Hinterlege GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET und GOOGLE_REDIRECT_URI in Railway.'
        })
      }
      res.json({ ok: true, data: { url: google.authUrl(req.params.customer_id) } })
    } catch (e) { next(e) }
  })

  router.get('/callback', async (req, res, next) => {
    try {
      const code = req.query.code
      let state = {}
      try { state = JSON.parse(decodeURIComponent(req.query.state || '{}')) } catch (_) {}
      if (!code || !state.customer_id) throw new Error('Google Callback unvollständig')

      const tokens = await google.exchangeCode(code)
      await google.saveTokens(state.customer_id, 'google', tokens)
      await recordSyncStatus(supabase, state.customer_id, 'google', 'connected', null, { oauth: true })

      res.send('<h1>Google verbunden</h1><p>Du kannst dieses Fenster schließen und den Sync im MMOS erneut starten.</p>')
    } catch (e) { next(e) }
  })

  router.post('/sync/:provider/:customer_id', async (req, res, next) => {
    const provider = normalizeProvider(req.params.provider)
    const { customer_id } = req.params
    const { site_url, property_id } = req.body || {}
    try {
      const result = await sync.sync(provider, customer_id, { site_url, property_id })

      await recordSyncStatus(supabase, customer_id, provider, 'synced', null, result)
      res.json({ ok: true, provider, data: result })
    } catch (e) {
      await recordSyncStatus(supabase, customer_id, provider, 'error', e.message)
      next(e)
    }
  })

  return router
}

googleRoutes.normalizeProvider = normalizeProvider
module.exports = googleRoutes
