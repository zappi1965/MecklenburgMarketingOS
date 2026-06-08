const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const ai = require('../services/aiCrmMailService')

function aiCrmMailRoutes() {
  const router = express.Router()

  // Admin oder Customer mit Zugriff erzeugen Entwuerfe.
  router.post('/draft/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const purpose = String(req.body?.purpose || 'free')
      const recipient = req.body?.recipient || {}
      const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
      const supabase = getSupabaseAdmin()
      const { data: customer } = await supabase
        .from('customers').select('id, name, email, brand_voice, metadata').eq('id', req.params.customer_id).maybeSingle()
      const r = await ai.draftMail({ purpose, customer, recipient, custom_note: req.body?.custom_note })
      res.json({ ok: true, ...r })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = aiCrmMailRoutes
