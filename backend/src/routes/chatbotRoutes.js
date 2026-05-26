const express = require('express')
const rateLimit = require('express-rate-limit')
const chatbot = require('../services/chatbotService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// Strenges Rate-Limit fuer den oeffentlichen Chatbot — pro IP max 20
// Messages/min. Schuetzt vor LLM-Cost-Abuse.
const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.CHATBOT_RATE_LIMIT_PER_MIN || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Chatbot-Anfragen. Bitte spaeter erneut versuchen.' }
})

function chatbotRoutes() {
  const router = express.Router()

  // Start einer Konversation auf einer Slug-Seite. Loest Customer aus dem
  // Slug auf, damit der System-Prompt den richtigen Kontext laedt.
  router.post('/start', chatRateLimit, async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const slug = String(req.body?.slug || '').trim()
      const visitor_token = String(req.body?.visitor_token || '').slice(0, 128)
      if (!slug) return res.status(400).json({ ok: false, error: 'slug fehlt' })

      // Customer ueber qr_campaigns.slug oder loyalty-Slug aufloesen.
      const { data: campaign } = await supabase
        .from('qr_campaigns')
        .select('customer_id')
        .eq('slug', slug)
        .maybeSingle()
      const customer_id = campaign?.customer_id || null

      const conv = await chatbot.startConversation({ slug, visitor_token, customer_id })
      res.json({ ok: true, conversation: conv })
    } catch (e) { next(e) }
  })

  router.post('/message', chatRateLimit, async (req, res, next) => {
    try {
      const supabase = getSupabaseAdmin()
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const conversation_id = String(req.body?.conversation_id || '')
      const user_message = String(req.body?.message || '')
      if (!conversation_id || !user_message) {
        return res.status(400).json({ ok: false, error: 'conversation_id und message Pflicht' })
      }
      // Customer + Slug aus der Konversation laden.
      const { data: conv } = await supabase
        .from('chatbot_conversations')
        .select('id, customer_id, slug')
        .eq('id', conversation_id)
        .maybeSingle()
      if (!conv) return res.status(404).json({ ok: false, error: 'Konversation nicht gefunden' })
      const { data: customer } = conv.customer_id
        ? await supabase
            .from('customers')
            .select('id, name, email, brand_voice, metadata')
            .eq('id', conv.customer_id)
            .maybeSingle()
        : { data: null }

      const result = await chatbot.sendMessage({
        conversation_id,
        user_message,
        customer,
        slug: conv.slug
      })
      res.json({ ok: true, ...result })
    } catch (e) {
      if (e.status === 429) return res.status(429).json({ ok: false, error: e.message })
      next(e)
    }
  })

  return router
}

module.exports = chatbotRoutes
