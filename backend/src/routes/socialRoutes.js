const express = require('express')
const social = require('../services/aiSocialPostService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// AI Social-Post-Generator. Global authentifiziert (via /api-Guard).
// Generierung ist Admin-only; Brand-Voice wird optional zum customer_id geladen.
function socialRoutes() {
  const router = express.Router()

  router.post('/generate', async (req, res, next) => {
    try {
      if (req.userRole !== 'admin') return res.status(403).json({ ok: false, error: 'Admin erforderlich' })
      const { customer_id, platform, topic, tone, language, count } = req.body || {}
      if (!platform) return res.status(400).json({ ok: false, error: 'platform erforderlich' })

      let businessName = ''
      let brandVoice = tone || ''
      if (customer_id) {
        try {
          const supabase = getSupabaseAdmin()
          const { data: cust } = await supabase
            .from('customers').select('name, business_name, brand_voice, metadata').eq('id', String(customer_id)).maybeSingle()
          businessName = cust?.business_name || cust?.name || ''
          if (!brandVoice) brandVoice = cust?.brand_voice || cust?.metadata?.brand_voice || ''
        } catch (_) {}
      }

      const result = await social.generatePosts({
        platform: String(platform), topic: topic ? String(topic) : '',
        tone: brandVoice, language: language ? String(language) : 'de',
        businessName, count: Number(count) || 3
      })
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = socialRoutes
