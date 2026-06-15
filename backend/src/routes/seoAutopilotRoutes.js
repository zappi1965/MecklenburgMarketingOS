const express = require('express')
const seo = require('../services/seoAutopilotService')
const seoImage = require('../services/seoImageService')
const seoPublish = require('../services/seoPublishService')
const secretBox = require('../lib/secretBox')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// SEO-Autopilot (Milestone 1): Brand-DNA, Keywords und Artikel generieren,
// speichern und freigeben. Admin-only (zusaetzlich zum globalen /api-Guard).
// Persistenz ueber Service-Role (getSupabaseAdmin) – konsistent mit den
// uebrigen Admin-Routen.
function seoAutopilotRoutes(injectedSupabase) {
  const router = express.Router()
  const db = () => injectedSupabase || getSupabaseAdmin()

  function requireAdmin(req, res) {
    if (req.userRole !== 'admin') { res.status(403).json({ ok: false, error: 'Admin erforderlich' }); return false }
    return true
  }

  async function loadCustomer(customer_id) {
    try {
      const { data } = await db()
        .from('customers').select('id, name, branch, business_name, brand_voice, city, metadata')
        .eq('id', String(customer_id)).maybeSingle()
      return data || null
    } catch (_) { return null }
  }

  // --- Brand-DNA ----------------------------------------------------------

  router.post('/brand-profile/generate', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { customer_id, website_url, notes, language } = req.body || {}
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const cust = await loadCustomer(customer_id)
      const out = await seo.generateBrandProfile({
        businessName: cust?.business_name || cust?.name || '',
        branch: cust?.branch || '',
        websiteUrl: website_url ? String(website_url) : '',
        notes: notes ? String(notes) : '',
        language: language ? String(language) : 'de'
      })
      res.json({ ok: true, ...out })
    } catch (e) { next(e) }
  })

  router.post('/brand-profile', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { customer_id, website_url, audience, tone, topics, value_props, language, provider } = req.body || {}
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const row = {
        customer_id: String(customer_id),
        website_url: website_url ? String(website_url) : null,
        audience: audience ? String(audience) : null,
        tone: tone ? String(tone) : null,
        topics: Array.isArray(topics) ? topics : [],
        value_props: Array.isArray(value_props) ? value_props : [],
        language: language ? String(language) : 'de',
        provider: provider ? String(provider) : null,
        updated_at: new Date().toISOString()
      }
      const { data, error } = await db().from('seo_brand_profiles')
        .upsert(row, { onConflict: 'customer_id' }).select().maybeSingle()
      if (error) throw new Error(error.message)
      res.json({ ok: true, profile: data })
    } catch (e) { next(e) }
  })

  router.get('/brand-profile', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const customer_id = req.query.customer_id
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const { data } = await db().from('seo_brand_profiles').select('*').eq('customer_id', String(customer_id)).maybeSingle()
      res.json({ ok: true, profile: data || null })
    } catch (e) { next(e) }
  })

  // --- Keywords -----------------------------------------------------------

  router.post('/keywords/generate', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { customer_id, count, language } = req.body || {}
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const cust = await loadCustomer(customer_id)
      let audience = ''
      try {
        const { data: bp } = await db().from('seo_brand_profiles').select('audience').eq('customer_id', String(customer_id)).maybeSingle()
        audience = bp?.audience || ''
      } catch (_) {}
      const out = await seo.generateKeywords({
        businessName: cust?.business_name || cust?.name || '',
        branch: cust?.branch || '',
        audience,
        city: cust?.city || cust?.metadata?.city || '',
        language: language ? String(language) : 'de',
        count: Number(count) || 10
      })
      res.json({ ok: true, ...out })
    } catch (e) { next(e) }
  })

  router.post('/keywords', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { customer_id, keywords } = req.body || {}
      if (!customer_id || !Array.isArray(keywords) || !keywords.length) {
        return res.status(400).json({ ok: false, error: 'customer_id und keywords[] erforderlich' })
      }
      const rows = keywords.map((k) => ({
        customer_id: String(customer_id),
        keyword: String(k?.keyword || '').trim(),
        intent: ['local', 'informational', 'transactional'].includes(String(k?.intent)) ? String(k.intent) : 'informational',
        priority: Math.min(5, Math.max(1, Number(k?.priority) || 3)),
        status: 'idea'
      })).filter((k) => k.keyword)
      if (!rows.length) return res.status(400).json({ ok: false, error: 'keine gueltigen Keywords' })
      const { data, error } = await db().from('seo_keyword_targets')
        .upsert(rows, { onConflict: 'customer_id,keyword', ignoreDuplicates: false }).select()
      if (error) throw new Error(error.message)
      res.json({ ok: true, keywords: data || [] })
    } catch (e) { next(e) }
  })

  router.get('/keywords', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const customer_id = req.query.customer_id
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const { data } = await db().from('seo_keyword_targets').select('*')
        .eq('customer_id', String(customer_id)).order('priority', { ascending: false }).limit(200)
      res.json({ ok: true, keywords: data || [] })
    } catch (e) { next(e) }
  })

  // --- Artikel ------------------------------------------------------------

  router.post('/articles/generate', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { customer_id, keyword, language } = req.body || {}
      if (!customer_id || !keyword) return res.status(400).json({ ok: false, error: 'customer_id und keyword erforderlich' })
      const cust = await loadCustomer(customer_id)
      let tone = cust?.brand_voice || ''
      let audience = ''
      try {
        const { data: bp } = await db().from('seo_brand_profiles').select('tone, audience').eq('customer_id', String(customer_id)).maybeSingle()
        if (bp?.tone) tone = bp.tone
        audience = bp?.audience || ''
      } catch (_) {}
      const out = await seo.generateArticle({
        keyword: String(keyword),
        businessName: cust?.business_name || cust?.name || '',
        branch: cust?.branch || '',
        tone, audience,
        language: language ? String(language) : 'de'
      })
      const row = {
        customer_id: String(customer_id),
        keyword: String(keyword),
        title: out.article.title,
        slug: out.article.slug,
        meta_description: out.article.meta_description,
        body_markdown: out.article.body_markdown,
        internal_link_ideas: out.article.internal_link_ideas || [],
        language: out.article.language,
        status: 'draft',
        provider: out.provider,
        model: out.provider === 'anthropic' ? (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5')
          : out.provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : 'mock',
        updated_at: new Date().toISOString()
      }
      const { data, error } = await db().from('seo_articles').insert(row).select().maybeSingle()
      if (error) throw new Error(error.message)
      res.json({ ok: true, provider: out.provider, article: data })
    } catch (e) { next(e) }
  })

  router.get('/articles', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const customer_id = req.query.customer_id
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const { data } = await db().from('seo_articles').select('*')
        .eq('customer_id', String(customer_id)).order('created_at', { ascending: false }).limit(200)
      res.json({ ok: true, articles: data || [] })
    } catch (e) { next(e) }
  })

  router.patch('/articles/:id', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const id = req.params.id
      const { title, meta_description, body_markdown, status } = req.body || {}
      const patch = { updated_at: new Date().toISOString() }
      if (title != null) patch.title = String(title)
      if (meta_description != null) patch.meta_description = String(meta_description)
      if (body_markdown != null) patch.body_markdown = String(body_markdown)
      if (status != null) {
        const s = String(status)
        if (!['draft', 'approved', 'published'].includes(s)) return res.status(400).json({ ok: false, error: 'ungueltiger status' })
        patch.status = s
        if (s === 'approved') patch.approved_at = new Date().toISOString()
      }
      const { data, error } = await db().from('seo_articles').update(patch).eq('id', String(id)).select().maybeSingle()
      if (error) throw new Error(error.message)
      res.json({ ok: true, article: data })
    } catch (e) { next(e) }
  })

  router.delete('/articles/:id', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { error } = await db().from('seo_articles').delete().eq('id', String(req.params.id))
      if (error) throw new Error(error.message)
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  // --- KI-Titelbild (Milestone 4) ----------------------------------------

  router.post('/articles/:id/cover', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { data: art } = await db().from('seo_articles').select('id, customer_id, title').eq('id', String(req.params.id)).maybeSingle()
      if (!art) return res.status(404).json({ ok: false, error: 'Artikel nicht gefunden' })
      const cust = await loadCustomer(art.customer_id)
      const out = await seoImage.generateCoverImage({
        title: art.title, branch: cust?.branch || '', businessName: cust?.business_name || cust?.name || ''
      })
      const { data, error } = await db().from('seo_articles')
        .update({ cover_image_url: out.url, updated_at: new Date().toISOString() })
        .eq('id', String(req.params.id)).select().maybeSingle()
      if (error) throw new Error(error.message)
      res.json({ ok: true, provider: out.provider, article: data })
    } catch (e) { next(e) }
  })

  // --- Veroeffentlichen (Milestone 2 + 4) --------------------------------
  // Zielabhaengig (In-App-Blog oder WordPress) ueber den gemeinsamen Service.

  router.post('/articles/:id/publish', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const result = await seoPublish.publishArticle(db(), String(req.params.id))
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/articles/:id/unpublish', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { data, error } = await db().from('seo_articles').update({
        status: 'approved', published_at: null, published_url: null, updated_at: new Date().toISOString()
      }).eq('id', String(req.params.id)).select().maybeSingle()
      if (error) throw new Error(error.message)
      res.json({ ok: true, article: data })
    } catch (e) { next(e) }
  })

  // --- Veroeffentlichungs-Plan (Milestone 3) -----------------------------

  // Maskiert sensible Felder in target_config fuer die Ausgabe: das
  // WordPress-Passwort wird nie zurueckgegeben, nur ob es gesetzt ist.
  function maskSchedule(sched) {
    if (!sched) return sched
    const cfg = (sched.target_config && typeof sched.target_config === 'object') ? { ...sched.target_config } : {}
    const hasPw = !!cfg.wp_app_password
    delete cfg.wp_app_password
    cfg.wp_app_password_set = hasPw
    return { ...sched, target_config: cfg }
  }

  router.get('/schedule', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const customer_id = req.query.customer_id
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const { data } = await db().from('seo_publishing_schedules').select('*').eq('customer_id', String(customer_id)).maybeSingle()
      res.json({ ok: true, schedule: maskSchedule(data) })
    } catch (e) { next(e) }
  })

  router.post('/schedule', async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) return
      const { customer_id, enabled, cadence, auto_publish, target_type, target_config } = req.body || {}
      if (!customer_id) return res.status(400).json({ ok: false, error: 'customer_id erforderlich' })
      const { data: existing } = await db().from('seo_publishing_schedules')
        .select('next_run_at, target_config').eq('customer_id', String(customer_id)).maybeSingle()

      // target_config zusammenfuehren: WP-Passwort verschluesselt ablegen;
      // ein leeres Passwort-Feld behaelt den bestehenden (verschluesselten) Wert.
      const incoming = (target_config && typeof target_config === 'object') ? target_config : {}
      const prevCfg = (existing?.target_config && typeof existing.target_config === 'object') ? existing.target_config : {}
      const cfg = {
        language: incoming.language || prevCfg.language || 'de',
        wp_url: incoming.wp_url != null ? String(incoming.wp_url) : (prevCfg.wp_url || ''),
        wp_user: incoming.wp_user != null ? String(incoming.wp_user) : (prevCfg.wp_user || '')
      }
      if (incoming.wp_app_password) cfg.wp_app_password = secretBox.encrypt(String(incoming.wp_app_password))
      else if (prevCfg.wp_app_password) cfg.wp_app_password = prevCfg.wp_app_password

      const row = {
        customer_id: String(customer_id),
        enabled: !!enabled,
        cadence: ['daily', 'weekly'].includes(String(cadence)) ? String(cadence) : 'weekly',
        auto_publish: !!auto_publish,
        target_type: ['in_app', 'wordpress'].includes(String(target_type)) ? String(target_type) : 'in_app',
        target_config: cfg,
        updated_at: new Date().toISOString()
      }
      // next_run_at neu setzen, wenn aktiviert und noch keiner geplant ist.
      if (row.enabled && !existing?.next_run_at) row.next_run_at = new Date().toISOString()
      if (!row.enabled) row.next_run_at = null
      const { data, error } = await db().from('seo_publishing_schedules')
        .upsert(row, { onConflict: 'customer_id' }).select().maybeSingle()
      if (error) throw new Error(error.message)
      res.json({ ok: true, schedule: maskSchedule(data) })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = seoAutopilotRoutes
