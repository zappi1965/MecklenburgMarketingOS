// Mini-Website / Google-Booster.
// - Öffentliche One-Pager-Microsite aus gespeicherter Config + Live-MMOS-Daten.
// - Google-Booster-Checkliste wird aus dem (im Frontend kostengeschützt erzeugten)
//   Mini-Audit gemappt. Das Backend ruft KEIN Google direkt auf.
//
// Tabelle: mini_websites (siehe Migration 0121).
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
  return base || 'site'
}

// Mappt ein Mini-Audit-Ergebnis (quickCheck) auf eine Booster-Checkliste.
// Reine Funktion. Erwartet das Frontend-Audit-DTO (quickCheck[], score, overallStatus).
function boosterFromAudit(audit = {}) {
  const quick = Array.isArray(audit.quickCheck) ? audit.quickCheck : []
  const items = quick.map((q) => ({
    key: q.key,
    area: q.area,
    status: q.status, // 'stark' | 'bedingt' | 'kritisch'
    note: q.note || '',
    done: q.status === 'stark', // bereits gut = erledigt
    action_needed: q.status !== 'stark'
  }))
  const openCount = items.filter((i) => i.action_needed).length
  return {
    score: Number(audit.score || 0),
    overall_status: audit.overallStatus || 'unbekannt',
    open_count: openCount,
    items,
    computed_at: new Date().toISOString()
  }
}

// Baut das öffentliche DTO (Whitelist! keine internen Felder).
function buildPublicSiteDto({ site, customer, reviewAggregate }) {
  if (!site || site.enabled === false) return null
  const brand = site.brand || {}
  const hero = site.hero || {}
  const cta = site.cta || {}
  return {
    slug: site.slug,
    brand: {
      name: brand.name || customer?.name || customer?.company_name || 'Unser Betrieb',
      logo_url: brand.logo_url || null,
      primary_color: brand.primary_color || null
    },
    hero: {
      headline: hero.headline || brand.name || customer?.name || 'Willkommen',
      subline: hero.subline || null,
      image_url: hero.image_url || null
    },
    branch: customer?.branch || null,
    hours: Array.isArray(site.hours) ? site.hours : [],
    services: Array.isArray(site.services) ? site.services : [],
    cta: { label: cta.label || null, url: cta.url || null, phone: cta.phone || null },
    reviews: site.show_reviews
      ? { average: reviewAggregate?.average ?? null, count: reviewAggregate?.count ?? 0 }
      : null
  }
}

class MiniWebsiteService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async getOrCreate(customerId) {
    const existing = await this.supabase.from('mini_websites').select('*').eq('customer_id', customerId).maybeSingle()
    if (existing?.data) return existing.data
    const cust = await this.supabase.from('customers').select('id, name, slug, branch').eq('id', customerId).maybeSingle()
    const baseSlug = await this._uniqueSlug(cust?.data?.slug || cust?.data?.name || 'site')
    const { data, error } = await this.supabase
      .from('mini_websites')
      .insert({ customer_id: customerId, slug: baseSlug, enabled: false, brand: { name: cust?.data?.name || '' } })
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async _uniqueSlug(base) {
    let candidate = slugify(base)
    for (let i = 0; i < 25; i++) {
      const probe = i === 0 ? candidate : `${candidate}-${i + 1}`
      const { data } = await this.supabase.from('mini_websites').select('id').eq('slug', probe).maybeSingle()
      if (!data) return probe
    }
    return `${candidate}-${Math.random().toString(36).slice(2, 7)}`
  }

  async update(customerId, body = {}) {
    await this.getOrCreate(customerId)
    const patch = {}
    for (const k of ['enabled', 'brand', 'hero', 'hours', 'services', 'cta', 'show_reviews', 'google_place_id']) {
      if (body[k] !== undefined) patch[k] = body[k]
    }
    patch.updated_at = new Date().toISOString()
    const { data, error } = await this.supabase.from('mini_websites').update(patch).eq('customer_id', customerId).select('*').maybeSingle()
    if (error) throw error
    return data
  }

  async saveBooster(customerId, audit) {
    await this.getOrCreate(customerId)
    const booster = boosterFromAudit(audit || {})
    const { data, error } = await this.supabase
      .from('mini_websites')
      .update({ booster_state: booster, updated_at: new Date().toISOString() })
      .eq('customer_id', customerId)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async _reviewAggregate(customerId) {
    try {
      const { data } = await this.supabase.from('review_feedback').select('rating').eq('customer_id', customerId).limit(1000)
      const ratings = (data || []).map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n > 0)
      if (ratings.length === 0) return { average: null, count: 0 }
      const average = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      return { average, count: ratings.length }
    } catch (_) {
      return { average: null, count: 0 }
    }
  }

  // Public: liefert das saubere DTO oder null (nicht aktiviert / nicht gefunden).
  async assemblePublicSite(slug) {
    const { data: site } = await this.supabase.from('mini_websites').select('*').eq('slug', slug).maybeSingle()
    if (!site || !site.enabled) return null
    const { data: customer } = await this.supabase.from('customers').select('id, name, slug, branch').eq('id', site.customer_id).maybeSingle()
    const reviewAggregate = site.show_reviews ? await this._reviewAggregate(site.customer_id) : null
    return buildPublicSiteDto({ site, customer, reviewAggregate })
  }
}

module.exports = { MiniWebsiteService, slugify, boosterFromAudit, buildPublicSiteDto }
