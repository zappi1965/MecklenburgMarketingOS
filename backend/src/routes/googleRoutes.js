const express = require('express')
const GoogleApiService = require('../services/googleApiService')
const ApiSyncService = require('../services/apiSyncService')

const PROVIDER_ALIASES = {
  'google-business': 'google-business',
  'google business': 'google-business',
  'google business profile': 'google-business',
  'business profile': 'google-business',
  'gbp': 'google-business',
  'search-console': 'search-console',
  'search console': 'search-console',
  'google search console': 'search-console',
  'gsc': 'search-console',
  'analytics': 'analytics',
  'google analytics': 'analytics',
  'google analytics 4': 'analytics',
  'ga4': 'analytics',
  'meta': 'meta',
  'meta business suite': 'meta'
}

function normalizeProvider(provider = '') {
  const key = decodeURIComponent(String(provider || '')).trim().toLowerCase()
  return PROVIDER_ALIASES[key] || key.replace(/_/g, '-')
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
      let result
      if (provider === 'google-business') result = await sync.syncGoogleBusiness(customer_id)
      else if (provider === 'search-console') result = await sync.syncSearchConsole(customer_id, site_url)
      else if (provider === 'analytics') result = await sync.syncAnalytics(customer_id, property_id)
      else if (provider === 'meta') {
        result = { ok: true, provider: 'meta', mode: 'placeholder_not_connected', message: 'Meta Business Suite ist vorbereitet, aber die echte Meta API ist noch nicht angebunden.' }
      } else {
        const err = new Error(`Unbekannter Google/API Provider: ${req.params.provider}`)
        err.status = 400
        err.code = 'UNKNOWN_PROVIDER'
        err.hint = 'Nutze google-business, search-console, analytics oder meta.'
        throw err
      }

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
