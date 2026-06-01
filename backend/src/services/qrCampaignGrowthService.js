async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const PLACEMENTS = [
  { key: 'table_tent', label: 'Tischaufsteller', cta: 'Scannen & Punkte sammeln' },
  { key: 'receipt', label: 'Kassenbon', cta: 'Bewerte deinen Besuch' },
  { key: 'counter', label: 'Tresen', cta: 'Hol dir deinen Bonus' },
  { key: 'window', label: 'Schaufenster', cta: 'Jetzt scannen' },
  { key: 'flyer', label: 'Flyer', cta: 'Angebot sichern' },
  { key: 'business_card', label: 'Visitenkarte', cta: 'Kontakt speichern' },
  { key: 'social_story', label: 'Social-Media-Story', cta: 'Jetzt teilnehmen' },
  { key: 'packaging', label: 'Verpackung', cta: 'Treuepunkte sammeln' }
]

const CAMPAIGN_TYPES = [
  { key: 'review', label: 'Bewertungen sammeln', default_cta: 'Bewerte uns in 30 Sekunden' },
  { key: 'loyalty', label: 'Loyalty / Punkte sammeln', default_cta: 'Scannen & Punkte sammeln' },
  { key: 'feedback', label: 'Internes Feedback sammeln', default_cta: 'Sag uns, wie es war' },
  { key: 'voucher', label: 'Gutschein aktivieren', default_cta: 'Gutschein sichern' },
  { key: 'raffle', label: 'Gewinnspiel', default_cta: 'Teilnehmen & gewinnen' },
  { key: 'booking', label: 'Terminbuchung', default_cta: 'Termin buchen' },
  { key: 'referral', label: 'Freunde werben', default_cta: 'Freunde empfehlen' },
  { key: 'newsletter', label: 'Newsletter-Anmeldung', default_cta: 'News & Angebote erhalten' },
  { key: 'event_checkin', label: 'Event Check-in', default_cta: 'Check-in starten' }
]

function slugify(value = '') {
  return String(value || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'qr'
}

function isActive(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return row.active !== false && row.is_deleted !== true && !row.deleted_at && !['deleted','archived','inactive','blocked','paused','beendet'].includes(s)
}

function recordFromPlacement({ customer_id, base_campaign, placement, type = 'loyalty', title = null, cta = null }) {
  const slug = slugify(`${base_campaign?.slug || base_campaign?.title || 'kampagne'}-${placement.key}`)
  const url = `/q/${slug}`
  return {
    customer_id,
    title: title || `${base_campaign?.title || base_campaign?.name || 'QR-Kampagne'} · ${placement.label}`,
    name: title || `${base_campaign?.title || base_campaign?.name || 'QR-Kampagne'} · ${placement.label}`,
    slug,
    target_url: url,
    public_url: url,
    active: true,
    status: 'Aktiv',
    mode: type,
    scans: 0,
    conversions: 0,
    metadata: {
      growth_tool: 'placement_tracking',
      parent_qr_campaign_id: base_campaign?.id || null,
      parent_slug: base_campaign?.slug || null,
      placement_key: placement.key,
      placement_label: placement.label,
      campaign_type: type,
      cta: cta || placement.cta,
      landing_url: `/l/${slug}`,
      qr_scan_url: url
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

async function listQrGrowthOverview(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const [qr, tx, reviews, leads, records] = await Promise.all([
    safeQuery(supabase.from('qr_campaigns').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(500)),
    safeQuery(supabase.from('loyalty_transactions').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(2000)),
    safeQuery(supabase.from('review_feedback').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1000)),
    safeQuery(supabase.from('prospect_leads').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1000)),
    safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customer_id).in('resource', ['qr_funnel_events','qr_print_packages','qr_ab_tests']).order('created_at', { ascending: false }).limit(2000))
  ])
  const qrRows = qr.data || []
  const txRows = tx.data || []
  const reviewRows = reviews.data || []
  const leadRows = leads.data || []
  const eventRows = (records.data || []).filter((r) => r.resource === 'qr_funnel_events')
  const placements = qrRows.map((q) => {
    const placementKey = q.metadata?.placement_key || 'default'
    const scans = Number(q.scans || q.metadata?.scan_count || 0)
    const conversions = Number(q.conversions || q.metadata?.conversion_count || 0)
    const txCount = txRows.filter((t) => String(t.qr_campaign_id || t.metadata?.qr_campaign_id || '') === String(q.id)).length
    const reviewCount = reviewRows.filter((r) => String(r.qr_campaign_id || r.metadata?.qr_campaign_id || '') === String(q.id)).length
    const leadCount = leadRows.filter((l) => String(l.qr_campaign_id || l.metadata?.qr_campaign_id || '') === String(q.id)).length
    const events = eventRows.filter((e) => String(e.payload?.qr_campaign_id || '') === String(q.id))
    const actionCount = conversions + txCount + reviewCount + leadCount + events.filter((e) => ['form_completed','reward_redeemed','google_opened'].includes(e.payload?.event_type)).length
    const conversionRate = scans > 0 ? Math.round(actionCount / scans * 1000) / 10 : 0
    return {
      id: q.id,
      slug: q.slug,
      title: q.title || q.name,
      placement_key: placementKey,
      placement_label: q.metadata?.placement_label || PLACEMENTS.find((p) => p.key === placementKey)?.label || 'Standard',
      campaign_type: q.metadata?.campaign_type || q.mode || q.metadata?.purpose || 'loyalty',
      target_url: q.target_url || q.public_url || (q.slug ? `/q/${q.slug}` : null),
      scans,
      actions: actionCount,
      transactions: txCount,
      reviews: reviewCount,
      leads: leadCount,
      conversion_rate: conversionRate,
      active: isActive(q)
    }
  })
  const issues = []
  for (const p of placements) {
    if (!p.target_url?.startsWith('/q/')) issues.push({ severity: 'warning', issue: 'qr_target_not_tokenized', qr_campaign_id: p.id, hint: 'QR-Ziel auf /q/[slug] migrieren.' })
    if (p.scans > 30 && p.conversion_rate < 5) issues.push({ severity: 'warning', issue: 'many_scans_low_conversion', qr_campaign_id: p.id, hint: 'CTA/Landingpage/Reward verbessern.' })
    if (p.scans < 5 && p.active) issues.push({ severity: 'info', issue: 'low_scan_volume', qr_campaign_id: p.id, hint: 'QR besser platzieren oder Druckmaterial erstellen.' })
  }
  const totals = placements.reduce((acc, p) => {
    acc.scans += p.scans
    acc.actions += p.actions
    acc.reviews += p.reviews
    acc.leads += p.leads
    return acc
  }, { scans: 0, actions: 0, reviews: 0, leads: 0 })
  totals.conversion_rate = totals.scans > 0 ? Math.round(totals.actions / totals.scans * 1000) / 10 : 0
  return { ok: !issues.some((i) => i.severity === 'critical'), totals, placements, issues, campaign_types: CAMPAIGN_TYPES, placement_templates: PLACEMENTS }
}

async function createPlacementVariants(supabase, { customer_id, parent_qr_campaign_id = null, campaign_type = 'loyalty', placements = [], title = null } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const selectedPlacements = (placements.length ? placements : ['table_tent','receipt','counter']).map((key) => PLACEMENTS.find((p) => p.key === key)).filter(Boolean)
  let parent = null
  if (parent_qr_campaign_id) {
    const found = await safeQuery(supabase.from('qr_campaigns').select('*').eq('id', parent_qr_campaign_id).maybeSingle())
    parent = found.data || null
  }
  if (!parent) parent = { title: title || 'QR-Kampagne', slug: slugify(title || 'qr-kampagne') }
  const created = []
  for (const placement of selectedPlacements) {
    const row = recordFromPlacement({ customer_id, base_campaign: parent, placement, type: campaign_type, title: title ? `${title} · ${placement.label}` : null })
    let saved = await safeQuery(supabase.from('qr_campaigns').insert(row).select('*').maybeSingle())
    if (saved.error && String(saved.error.message || '').includes('duplicate')) {
      row.slug = `${row.slug}-${Date.now().toString(36).slice(-4)}`
      row.target_url = `/q/${row.slug}`
      row.public_url = `/q/${row.slug}`
      row.metadata.landing_url = `/l/${row.slug}`
      row.metadata.qr_scan_url = `/q/${row.slug}`
      saved = await safeQuery(supabase.from('qr_campaigns').insert(row).select('*').maybeSingle())
    }
    if (saved.error) created.push({ ok: false, placement: placement.key, error: saved.error.message })
    else created.push({ ok: true, placement: placement.key, qr_campaign: saved.data })
  }
  return { ok: created.every((c) => c.ok), created }
}

async function recordQrFunnelEvent(supabase, payload = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert' }
  const id = payload.id || `qrf_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const now = new Date().toISOString()
  const row = {
    resource: 'qr_funnel_events',
    local_id: id,
    customer_id: payload.customer_id || null,
    title: payload.event_type || 'qr_event',
    status: 'active',
    payload: { ...payload, id, created_at: now },
    created_at: now,
    updated_at: now
  }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, event: saved.data }
}

async function createPrintPackage(supabase, { customer_id, qr_campaign_id, formats = ['table_tent','a5_flyer','receipt_note','social_story'], brand = {} } = {}) {
  if (!supabase || !customer_id || !qr_campaign_id) return { ok: false, error: 'customer_id/qr_campaign_id fehlt' }
  const qr = await safeQuery(supabase.from('qr_campaigns').select('*').eq('id', qr_campaign_id).maybeSingle())
  if (!qr.data) return { ok: false, error: 'QR-Kampagne nicht gefunden' }
  const q = qr.data
  const cta = brand.cta || q.metadata?.cta || CAMPAIGN_TYPES.find((t) => t.key === (q.metadata?.campaign_type || q.mode))?.default_cta || 'Jetzt scannen'
  const url = q.target_url || q.public_url || `/q/${q.slug}`
  const assets = formats.map((format) => ({
    format,
    title: `${q.title || q.name || 'QR-Kampagne'} · ${format}`,
    cta,
    qr_url: url,
    landing_url: q.slug ? `/l/${q.slug}` : null,
    copy: {
      headline: cta,
      subline: brand.subline || 'Schnell scannen und Vorteil sichern.',
      footer: brand.footer || 'Powered by Mecklenburg Marketing'
    },
    print_spec: {
      table_tent: 'A6 quer, beidseitig, 300dpi',
      a5_flyer: 'A5 hoch, 300dpi',
      receipt_note: 'Kurztext für Kassenbon',
      social_story: '1080x1920 Story'
    }[format] || 'PDF-ready'
  }))
  const record = {
    resource: 'qr_print_packages',
    local_id: `print_${qr_campaign_id}_${Date.now()}`,
    customer_id,
    title: `Druckpaket ${q.title || q.name || q.slug}`,
    status: 'draft',
    payload: { qr_campaign_id, campaign_slug: q.slug, assets, brand, created_at: new Date().toISOString() },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(record).select('*').maybeSingle())
  return { ok: !saved.error, error: saved.error?.message, print_package: saved.data || record, assets }
}

async function recommendQrOptimizations(supabase, { customer_id } = {}) {
  const overview = await listQrGrowthOverview(supabase, { customer_id })
  if (!overview.ok && !overview.placements) return overview
  const recommendations = []
  for (const p of overview.placements || []) {
    if (p.scans < 5) recommendations.push({ priority: 'medium', qr_campaign_id: p.id, title: p.title, recommendation: 'QR sichtbarer platzieren oder Tischaufsteller/Flyer erzeugen.' })
    if (p.scans >= 20 && p.conversion_rate < 5) recommendations.push({ priority: 'high', qr_campaign_id: p.id, title: p.title, recommendation: 'CTA/Reward verbessern, Formular kürzen oder Google-Button prominenter platzieren.' })
    if (p.reviews === 0 && p.scans > 10 && p.campaign_type === 'review') recommendations.push({ priority: 'high', qr_campaign_id: p.id, title: p.title, recommendation: 'Bewertungsflow prüfen: Button, Google-Link und Sterne-Routing kontrollieren.' })
  }
  if (!recommendations.length) recommendations.push({ priority: 'low', recommendation: 'QR-Kampagnen laufen stabil. Nächster Hebel: A/B-Test oder neues Placement.' })
  return { ok: true, recommendations, totals: overview.totals }
}

module.exports = {
  PLACEMENTS,
  CAMPAIGN_TYPES,
  listQrGrowthOverview,
  createPlacementVariants,
  recordQrFunnelEvent,
  createPrintPackage,
  recommendQrOptimizations
}
