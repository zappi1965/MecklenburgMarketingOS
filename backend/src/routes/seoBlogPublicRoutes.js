const express = require('express')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

// Oeffentlicher SEO-Blog (Milestone 2). KEINE Authentifizierung:
// liefert ausschliesslich veroeffentlichte Artikel (status = 'published')
// je Kunde, adressiert ueber den sprechenden blog_slug.
// Muss in server.js zu PUBLIC_PATHS hinzugefuegt sein.
function seoBlogPublicRoutes(injectedSupabase) {
  const router = express.Router()
  const db = () => injectedSupabase || getSupabaseAdmin()

  async function resolveCustomer(blogSlug) {
    const { data: bp } = await db()
      .from('seo_brand_profiles').select('customer_id, blog_slug, audience')
      .eq('blog_slug', String(blogSlug)).maybeSingle()
    if (!bp) return null
    let businessName = ''
    try {
      const { data: cust } = await db()
        .from('customers').select('name, business_name').eq('id', bp.customer_id).maybeSingle()
      businessName = cust?.business_name || cust?.name || ''
    } catch (_) {}
    return { customerId: bp.customer_id, blogSlug: bp.blog_slug, businessName }
  }

  // Liste veroeffentlichter Artikel eines Kunden-Blogs.
  router.get('/:blogSlug', async (req, res, next) => {
    try {
      const ctx = await resolveCustomer(req.params.blogSlug)
      if (!ctx) return res.status(404).json({ ok: false, error: 'Blog nicht gefunden' })
      const { data } = await db()
        .from('seo_articles')
        .select('title, slug, meta_description, published_at, language')
        .eq('customer_id', ctx.customerId).eq('status', 'published')
        .order('published_at', { ascending: false }).limit(100)
      res.json({ ok: true, blog: { slug: ctx.blogSlug, business_name: ctx.businessName }, articles: data || [] })
    } catch (e) { next(e) }
  })

  // Einzelner veroeffentlichter Artikel.
  router.get('/:blogSlug/:articleSlug', async (req, res, next) => {
    try {
      const ctx = await resolveCustomer(req.params.blogSlug)
      if (!ctx) return res.status(404).json({ ok: false, error: 'Blog nicht gefunden' })
      const { data } = await db()
        .from('seo_articles')
        .select('title, slug, meta_description, body_markdown, cover_image_url, published_at, language')
        .eq('customer_id', ctx.customerId).eq('status', 'published')
        .eq('slug', String(req.params.articleSlug)).maybeSingle()
      if (!data) return res.status(404).json({ ok: false, error: 'Artikel nicht gefunden' })
      res.json({ ok: true, blog: { slug: ctx.blogSlug, business_name: ctx.businessName }, article: data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = seoBlogPublicRoutes
