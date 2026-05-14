
const express = require('express')
const GoogleApiService = require('../services/googleApiService')
const ApiSyncService = require('../services/apiSyncService')

function googleRoutes(supabase) {
  const router = express.Router()
  const google = new GoogleApiService(supabase)
  const sync = new ApiSyncService(supabase)

  router.get('/auth-url/:customer_id', (req, res, next) => {
    try {
      res.json({ ok: true, data: { url: google.authUrl(req.params.customer_id) } })
    } catch (e) { next(e) }
  })

  router.get('/callback', async (req, res, next) => {
    try {
      const code = req.query.code
      const state = JSON.parse(decodeURIComponent(req.query.state || '{}'))
      if (!code || !state.customer_id) throw new Error('Google Callback unvollständig')

      const tokens = await google.exchangeCode(code)
      await google.saveTokens(state.customer_id, 'google', tokens)

      res.send('<h1>Google verbunden</h1><p>Du kannst dieses Fenster schließen.</p>')
    } catch (e) { next(e) }
  })

  router.post('/sync/:provider/:customer_id', async (req, res, next) => {
    try {
      const { provider, customer_id } = req.params
      const { site_url, property_id } = req.body || {}
      let result
      if (provider === 'google-business') result = await sync.syncGoogleBusiness(customer_id)
      else if (provider === 'search-console') result = await sync.syncSearchConsole(customer_id, site_url)
      else if (provider === 'analytics') result = await sync.syncAnalytics(customer_id, property_id)
      else throw new Error('Unbekannter Google Provider')
      res.json({ ok: true, data: result })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = googleRoutes
