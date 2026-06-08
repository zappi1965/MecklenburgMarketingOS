// Google-Business-Profile-Manager.
//
// Erlaubt Admins, Posts (Standard/Event/Offer/Alert) auf das Google
// Business Profile eines Customers zu veroeffentlichen.
//
// Mock-Modus (Default fuer Local/CI): kein echter Google-API-Call,
// gmb_posts wird auf 'published' gesetzt + external_id als 'mock-<id>'.
//
// Production: nutzt googleApiService fuer den OAuth-Token-Lifecycle.
// Die Google Business Profile API ist seit 2023 partner-only — fuer
// MMOS-Partner-Status muessen Customer ihre Profile per OAuth explizit
// verbinden. Bis dahin ist Mock + Status-Tracking voll funktional.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const POST_TYPES = ['STANDARD', 'EVENT', 'OFFER', 'ALERT']

function provider() {
  return process.env.GMB_PROVIDER === 'google' ? 'google' : 'mock'
}

async function createPost({ customer_id, post_type = 'STANDARD', summary, cta_label, cta_url, image_url, start_time, end_time, scheduled_at, created_by }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!customer_id) { const e = new Error('customer_id fehlt'); e.status = 400; throw e }
  if (!POST_TYPES.includes(post_type)) { const e = new Error('Unbekannter post_type'); e.status = 400; throw e }
  const text = String(summary || '').trim()
  if (text.length < 10) { const e = new Error('summary muss mindestens 10 Zeichen lang sein'); e.status = 400; throw e }
  if (text.length > 1500) { const e = new Error('summary darf maximal 1500 Zeichen lang sein'); e.status = 400; throw e }

  const status = scheduled_at ? 'scheduled' : 'draft'
  const { data, error } = await supabase
    .from('gmb_posts')
    .insert({
      customer_id, post_type, summary: text, cta_label, cta_url, image_url,
      start_time, end_time, status, scheduled_at, created_by
    })
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

async function publishPost({ id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { data: post } = await supabase
    .from('gmb_posts').select('*').eq('id', id).maybeSingle()
  if (!post) { const e = new Error('Post nicht gefunden'); e.status = 404; throw e }
  if (post.status === 'published') return { skipped: true, reason: 'already_published', post }

  const p = provider()
  let external_id = null
  let error_message = null

  if (p === 'mock') {
    external_id = `mock-${Date.now()}-${id.slice(0, 8)}`
  } else {
    // TODO: echte Google API anbinden (googleApiService.getAccessToken,
    // POST /v4/accounts/<acc>/locations/<loc>/localPosts).
    error_message = 'Google Business Profile API nicht verbunden (Partner-Status erforderlich)'
  }

  const update = {
    status: error_message ? 'failed' : 'published',
    published_at: error_message ? null : new Date().toISOString(),
    external_id,
    error_message
  }
  const { data, error } = await supabase
    .from('gmb_posts').update(update).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  return data
}

async function listForCustomer({ customer_id, status }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  let q = supabase
    .from('gmb_posts').select('*').eq('customer_id', customer_id)
    .order('created_at', { ascending: false }).limit(200)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

async function deletePost({ id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const { error } = await supabase.from('gmb_posts').delete().eq('id', id)
  if (error) throw error
  return { ok: true }
}

module.exports = { createPost, publishPost, listForCustomer, deletePost, POST_TYPES }
