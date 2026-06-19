// "Aktionen & Angebote" / Aktions-Builder.
// Zeitlich begrenzte öffentliche Aktionsseiten. Der Server ist die alleinige
// Wahrheit über Gültigkeit (Countdown im Client ist nur kosmetisch).
//
// Tabelle: deal_campaigns (siehe Migration 0120).
// Exportierte Pure-Funktionen sind ohne Supabase testbar.

function slugify(value) {
  const base = String(value || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return base || 'deal'
}

// Liefert den effektiven Status anhand der Zeitfenster (UTC). Reine Funktion.
function effectiveDealStatus(deal, now = new Date()) {
  if (!deal) return 'expired'
  if (deal.status === 'archived' || deal.status === 'draft') return deal.status
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const starts = deal.starts_at ? new Date(deal.starts_at).getTime() : null
  const expires = deal.expires_at ? new Date(deal.expires_at).getTime() : null
  if (starts !== null && t < starts) return 'scheduled'
  if (expires !== null && t >= expires) return 'expired'
  return 'active'
}

function isDealPubliclyVisible(deal, now = new Date()) {
  const s = effectiveDealStatus(deal, now)
  return s === 'active'
}

function sanitizePublicUrl(value, { image = false } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (raw.startsWith('/')) return raw.replace(/[\r\n]/g, '')
  try {
    const u = new URL(raw)
    const protocol = u.protocol.toLowerCase()
    if (image) {
      if (protocol !== 'https:') return null
      return u.toString()
    }
    if (protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') return u.toString()
    return null
  } catch (_) {
    return null
  }
}

function sanitizeDealPayload(payload = {}) {
  const next = { ...payload }
  if ('image_url' in next) next.image_url = sanitizePublicUrl(next.image_url, { image: true })
  if ('cta_url' in next) next.cta_url = sanitizePublicUrl(next.cta_url, { image: false })
  return next
}

// Public-DTO ohne interne Felder.
function publicDealDto(deal, now = new Date()) {
  if (!deal) return null
  return {
    slug: deal.slug,
    title: deal.title,
    subtitle: deal.subtitle || null,
    body: deal.body || null,
    discount_label: deal.discount_label || null,
    image_url: sanitizePublicUrl(deal.image_url, { image: true }),
    cta_label: deal.cta_label || null,
    cta_url: sanitizePublicUrl(deal.cta_url, { image: false }),
    starts_at: deal.starts_at || null,
    expires_at: deal.expires_at || null,
    status: effectiveDealStatus(deal, now)
  }
}

class DealCampaignService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async _uniqueSlug(base, customerId) {
    let candidate = slugify(base)
    for (let i = 0; i < 25; i++) {
      const probe = i === 0 ? candidate : `${candidate}-${i + 1}`
      const { data } = await this.supabase.from('deal_campaigns').select('id').eq('slug', probe).maybeSingle()
      if (!data) return probe
    }
    return `${candidate}-${Math.random().toString(36).slice(2, 7)}`
  }

  async list(customerId) {
    const { data, error } = await this.supabase
      .from('deal_campaigns')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw error
    const now = new Date()
    return (data || []).map((d) => ({ ...d, effective_status: effectiveDealStatus(d, now) }))
  }

  async create(customerId, body = {}) {
    const slug = await this._uniqueSlug(body.slug || body.title, customerId)
    const payload = sanitizeDealPayload({
      customer_id: customerId,
      slug,
      title: String(body.title || 'Neue Aktion').slice(0, 160),
      subtitle: body.subtitle || null,
      body: body.body || null,
      discount_label: body.discount_label || null,
      image_url: body.image_url || null,
      cta_label: body.cta_label || null,
      cta_url: body.cta_url || null,
      starts_at: body.starts_at || null,
      expires_at: body.expires_at || null,
      status: body.status === 'active' ? 'active' : 'draft',
      metadata: body.metadata || {}
    })
    const { data, error } = await this.supabase.from('deal_campaigns').insert(payload).select('*').maybeSingle()
    if (error) throw error
    return data
  }

  async update(customerId, id, body = {}) {
    const patch = {}
    for (const k of ['title', 'subtitle', 'body', 'discount_label', 'image_url', 'cta_label', 'cta_url', 'starts_at', 'expires_at', 'status']) {
      if (body[k] !== undefined) patch[k] = body[k]
    }
    Object.assign(patch, sanitizeDealPayload(patch))
    patch.updated_at = new Date().toISOString()
    const { data, error } = await this.supabase
      .from('deal_campaigns')
      .update(patch)
      .eq('customer_id', customerId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async setStatus(customerId, id, status) {
    return this.update(customerId, id, { status })
  }

  async remove(customerId, id) {
    const { error } = await this.supabase.from('deal_campaigns').delete().eq('customer_id', customerId).eq('id', id)
    if (error) throw error
    return { ok: true }
  }

  // Public: nur aktive, im Zeitfenster liegende Deals.
  async publicResolve(slug) {
    const { data } = await this.supabase.from('deal_campaigns').select('*').eq('slug', slug).maybeSingle()
    if (!data) return { found: false }
    const now = new Date()
    if (!isDealPubliclyVisible(data, now)) {
      return { found: true, visible: false, status: effectiveDealStatus(data, now), dto: { slug: data.slug, title: data.title, status: effectiveDealStatus(data, now) } }
    }
    return { found: true, visible: true, dto: publicDealDto(data, now) }
  }

  async track(slug, kind) {
    const field = kind === 'share' ? 'share_count' : 'view_count'
    const { data } = await this.supabase.from('deal_campaigns').select('id,' + field).eq('slug', slug).maybeSingle()
    if (!data) return { ok: false }
    await this.supabase.from('deal_campaigns').update({ [field]: Number(data[field] || 0) + 1 }).eq('id', data.id)
    return { ok: true }
  }

  // Wartungs-Sweep: aktive Deals nach Ablauf auf expired setzen (für korrekte Listen).
  async sweepExpired() {
    const nowIso = new Date().toISOString()
    const { data } = await this.supabase
      .from('deal_campaigns')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('status', 'active')
      .lt('expires_at', nowIso)
      .select('id')
    return { expired: (data || []).length }
  }
}

module.exports = {
  DealCampaignService,
  slugify,
  effectiveDealStatus,
  isDealPubliclyVisible,
  publicDealDto,
  sanitizePublicUrl,
  sanitizeDealPayload
}
