// Gemeinsame Veroeffentlichungs-Logik (Milestone 2 + 4), genutzt von Route
// und Cron-Worker. Zielabhaengig:
//   - target_type 'in_app'    → In-House-Blog (/blog/<slug>/<artikel>)
//   - target_type 'wordpress' → Push via WordPress REST API (Mock ohne Keys)

const seo = require('./seoAutopilotService')
const wp = require('./wordpressPublishService')
const secretBox = require('../lib/secretBox')
const { markdownToHtml } = require('./seoMarkdown')
const { injectInternalLinks } = require('./seoInternalLinks')

// Sammelt veroeffentlichte Geschwister-Artikel als interne Link-Ziele.
async function siblingLinks(db, customerId, selfId) {
  const { data } = await db.from('seo_articles')
    .select('id, keyword, title, published_url')
    .eq('customer_id', customerId).eq('status', 'published').limit(200)
  return (data || [])
    .filter((a) => a.id !== selfId && a.published_url && (a.keyword || a.title))
    .map((a) => ({ keyword: a.keyword || a.title, url: a.published_url }))
}

// Stellt sicher, dass der Kunde einen eindeutigen blog_slug hat.
async function ensureBlogSlug(db, customer) {
  const { data: bp } = await db.from('seo_brand_profiles').select('blog_slug').eq('customer_id', customer.id).maybeSingle()
  if (bp?.blog_slug) return bp.blog_slug
  const base = seo._slugify(customer.business_name || customer.name || '') || `kunde-${String(customer.id).slice(0, 8)}`
  let slug = base
  for (let i = 0; i < 25; i++) {
    const { data: clash } = await db.from('seo_brand_profiles').select('customer_id').eq('blog_slug', slug).maybeSingle()
    if (!clash || clash.customer_id === customer.id) break
    slug = `${base}-${i + 2}`
  }
  await db.from('seo_brand_profiles')
    .upsert({ customer_id: customer.id, blog_slug: slug, updated_at: new Date().toISOString() }, { onConflict: 'customer_id' })
  return slug
}

// Veroeffentlicht einen vorhandenen Artikel gemaess dem Plan des Kunden.
async function publishArticle(db, articleId) {
  const { data: art } = await db.from('seo_articles').select('*').eq('id', String(articleId)).maybeSingle()
  if (!art) throw new Error('Artikel nicht gefunden')
  const { data: customer } = await db.from('customers')
    .select('id, name, business_name').eq('id', art.customer_id).maybeSingle()
  const { data: sched } = await db.from('seo_publishing_schedules')
    .select('target_type, target_config').eq('customer_id', art.customer_id).maybeSingle()

  const targetType = sched?.target_type === 'wordpress' ? 'wordpress' : 'in_app'
  let published_url
  let extra = {}

  // M5: automatische interne Verlinkung auf bereits veroeffentlichte Artikel.
  const links = await siblingLinks(db, art.customer_id, art.id)
  const linkedMarkdown = injectInternalLinks(art.body_markdown, links, 3)

  if (targetType === 'wordpress') {
    const cfg = sched?.target_config || {}
    const html = markdownToHtml(linkedMarkdown)
    const result = await wp.publishPost({
      wpUrl: cfg.wp_url, wpUser: cfg.wp_user, wpAppPassword: secretBox.decrypt(cfg.wp_app_password),
      title: art.title, contentHtml: html, status: 'publish',
      featuredImageUrl: art.cover_image_url || undefined
    })
    published_url = result.url
    extra = { wordpress: { id: result.id, mocked: !!result.mocked, featured_media: result.featured_media || null } }
  } else {
    const blogSlug = await ensureBlogSlug(db, customer || { id: art.customer_id })
    published_url = `/blog/${blogSlug}/${art.slug}`
  }

  const now = new Date().toISOString()
  const { data, error } = await db.from('seo_articles').update({
    status: 'published', published_at: now, published_url, approved_at: art.approved_at || now,
    body_markdown: linkedMarkdown, updated_at: now
  }).eq('id', String(articleId)).select().maybeSingle()
  if (error) throw new Error(error.message)
  return { article: data, target_type: targetType, internal_links: links.length ? Math.min(3, links.length) : 0, ...extra }
}

module.exports = { publishArticle, ensureBlogSlug }
