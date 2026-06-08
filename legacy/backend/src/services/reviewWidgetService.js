// Bewertungs-Widget als iframe-Snippet.
//
// Customer erzeugt im Admin eine Widget-Konfig mit slug + min_rating +
// show_count + theme. Die Website-Betreiber binden dann einen iframe ein:
//   <iframe src="https://app.example.com/api/review-widget/embed/<slug>"></iframe>
// Der Embed-Endpoint rendert HTML mit den passenden Reviews.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function clampInt(v, min, max, fallback) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

async function createWidget({ customer_id, slug, show_count = 5, min_rating = 4, theme = {} }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!customer_id || !slug) { const e = new Error('customer_id und slug Pflicht'); e.status = 400; throw e }
  const { data, error } = await supabase
    .from('review_widgets')
    .insert({
      customer_id,
      slug: String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      show_count: clampInt(show_count, 1, 20, 5),
      min_rating: clampInt(min_rating, 1, 5, 4),
      theme: theme || {}
    })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

async function updateWidget({ id, customer_id, ...patch }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const update = { updated_at: new Date().toISOString() }
  if (patch.show_count != null) update.show_count = clampInt(patch.show_count, 1, 20, 5)
  if (patch.min_rating != null) update.min_rating = clampInt(patch.min_rating, 1, 5, 4)
  if (patch.theme) update.theme = patch.theme
  if (patch.active != null) update.active = Boolean(patch.active)
  const { data, error } = await supabase
    .from('review_widgets').update(update).eq('id', id).eq('customer_id', customer_id)
    .select('*').maybeSingle()
  if (error) throw error
  return data
}

async function listForCustomer(customer_id) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('review_widgets').select('*').eq('customer_id', customer_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

function renderHtml({ widget, reviews }) {
  const theme = widget.theme || {}
  const primary = escapeHtml(theme.primary || '#d4af37')
  const background = escapeHtml(theme.background || '#ffffff')
  const text = escapeHtml(theme.text || '#111827')
  const items = (reviews || []).map((r) => {
    const stars = '★'.repeat(Math.max(0, Math.min(5, Number(r.rating || 0)))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Number(r.rating || 0))))
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE') : ''
    return `
      <li class="rw-item">
        <div class="rw-stars" aria-label="${escapeHtml(r.rating)} von 5 Sternen">${stars}</div>
        <p class="rw-text">${escapeHtml(r.feedback_text || '')}</p>
        <div class="rw-meta">${escapeHtml(r.reviewer_name || 'Anonym')} · ${escapeHtml(date)}</div>
      </li>`
  }).join('')

  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="robots" content="noindex">
<style>
  :root{color-scheme:light}
  body{margin:0;font-family:Inter,system-ui,Arial,sans-serif;background:${background};color:${text};padding:14px}
  .rw-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
  .rw-item{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;background:rgba(0,0,0,0.02)}
  .rw-stars{color:${primary};font-size:18px;letter-spacing:2px}
  .rw-text{margin:6px 0;font-size:14px;line-height:1.45}
  .rw-meta{font-size:12px;color:#6b7280}
  .rw-empty{color:#6b7280;font-size:13px}
</style>
</head><body>
<ul class="rw-list">${items || '<li class="rw-empty">Noch keine Bewertungen.</li>'}</ul>
</body></html>`
}

async function renderEmbed(slug) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data: widget } = await supabase
    .from('review_widgets').select('*').eq('slug', slug).eq('active', true).maybeSingle()
  if (!widget) { const e = new Error('Widget nicht gefunden'); e.status = 404; throw e }
  const { data: reviews } = await supabase
    .from('review_feedback')
    .select('rating, feedback_text, reviewer_name, created_at')
    .eq('customer_id', widget.customer_id)
    .gte('rating', widget.min_rating)
    .order('created_at', { ascending: false })
    .limit(widget.show_count)
  return renderHtml({ widget, reviews: reviews || [] })
}

module.exports = {
  createWidget, updateWidget, listForCustomer, renderEmbed, renderHtml,
  // Test helpers:
  _escapeHtml: escapeHtml,
  _clampInt: clampInt
}
