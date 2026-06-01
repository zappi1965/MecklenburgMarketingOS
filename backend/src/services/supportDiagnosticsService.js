async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function active(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return row.active !== false && row.is_deleted !== true && !row.deleted_at && !['deleted','archived','inactive','blocked','paused'].includes(s)
}

function rec(severity, area, issue, hint, data = {}) {
  return { severity, area, issue, hint, ...data }
}

async function inspectCustomerSupportDiagnostics(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt', recommendations: [] }

  const [customer, qr, programs, rewards, tokens, logs, reviews, tx] = await Promise.all([
    safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()),
    safeQuery(supabase.from('qr_campaigns').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(100)),
    safeQuery(supabase.from('loyalty_programs').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(100)),
    safeQuery(supabase.from('loyalty_rewards').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(100)),
    safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customer_id).eq('resource', 'qr_scan_tokens').order('created_at', { ascending: false }).limit(100)),
    safeQuery(supabase.from('activity_logs').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(100)),
    safeQuery(supabase.from('review_feedback').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(50)),
    safeQuery(supabase.from('loyalty_transactions').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(50))
  ])

  const recommendations = []
  if (!customer.data) recommendations.push(rec('critical', 'customer', 'customer_missing', 'Kunde existiert nicht oder ist nicht lesbar.'))
  if (customer.data && !active(customer.data)) recommendations.push(rec('critical', 'customer', 'customer_inactive', 'Kunde ist nicht aktiv.', { status: customer.data.status }))

  const qrRows = qr.data || []
  if (!qrRows.length) recommendations.push(rec('warning', 'qr', 'qr_missing', 'Keine QR-Kampagne für diesen Kunden gefunden.'))
  for (const q of qrRows) {
    if (!q.slug) recommendations.push(rec('critical', 'qr', 'qr_missing_slug', 'QR-Kampagne hat keinen Slug.', { id: q.id }))
    if (q.slug && !String(q.target_url || q.public_url || '').startsWith('/q/')) recommendations.push(rec('warning', 'qr', 'qr_target_not_tokenized', 'QR-Ziel zeigt nicht auf /q/[slug]. QR Legacy Migration ausführen.', { id: q.id, slug: q.slug, target_url: q.target_url, public_url: q.public_url }))
    if (!active(q)) recommendations.push(rec('warning', 'qr', 'qr_inactive', 'QR-Kampagne ist nicht aktiv.', { id: q.id, slug: q.slug, status: q.status }))
  }

  const programRows = programs.data || []
  if (!programRows.length && qrRows.some((q) => String(q.metadata?.purpose || q.mode || '').includes('loyalty'))) recommendations.push(rec('critical', 'loyalty', 'loyalty_program_missing', 'QR/Loyalty erwartet ein Loyalty-Programm, aber keines ist vorhanden.'))
  for (const q of qrRows) {
    const matching = programRows.find((p) => p.qr_campaign_id === q.id || (p.slug && q.slug && p.slug === q.slug))
    if (String(q.metadata?.purpose || q.mode || '').includes('loyalty') && !matching) recommendations.push(rec('warning', 'loyalty', 'program_not_linked_to_qr', 'QR hat kein verknüpftes Loyalty-Programm.', { qr_campaign_id: q.id, slug: q.slug }))
  }

  const rewardRows = rewards.data || []
  for (const r of rewardRows) {
    const points = Number(r.points_required || r.points || 0)
    if (active(r) && points < 0) recommendations.push(rec('warning', 'reward', 'reward_negative_points', 'Reward hat negative Punktebedingung.', { id: r.id }))
    if (active(r) && !r.title && !r.name) recommendations.push(rec('info', 'reward', 'reward_missing_title', 'Reward hat keinen Titel.', { id: r.id }))
  }

  const tokenRows = tokens.data || []
  const invalidTokens = tokenRows.filter((t) => t.status === 'active' && t.payload?.expires_at && new Date(t.payload.expires_at).getTime() < Date.now())
  if (invalidTokens.length) recommendations.push(rec('info', 'qr_token', 'expired_tokens_active', 'Abgelaufene QR-Tokens sind noch aktiv. Token Cleanup ausführen.', { count: invalidTokens.length }))

  const errorRows = (logs.data || []).filter((l) => ['error','critical','failed','warning'].includes(String(l.severity || l.status || '').toLowerCase()) || `${l.title || ''} ${l.message || ''}`.toLowerCase().includes('fehl'))
  if (errorRows.length) recommendations.push(rec('warning', 'errors', 'recent_errors_found', 'Es gibt aktuelle Fehler/Warnungen zum Kunden.', { count: errorRows.length }))

  const ok = !recommendations.some((r) => r.severity === 'critical')
  return {
    ok,
    customer: customer.data || null,
    counts: {
      qr_campaigns: qrRows.length,
      loyalty_programs: programRows.length,
      rewards: rewardRows.length,
      recent_tokens: tokenRows.length,
      recent_errors: errorRows.length,
      reviews: (reviews.data || []).length,
      loyalty_transactions: (tx.data || []).length
    },
    recommendations,
    latest: {
      qr_campaigns: qrRows.slice(0, 5),
      loyalty_programs: programRows.slice(0, 5),
      errors: errorRows.slice(0, 10),
      tokens: tokenRows.slice(0, 10)
    }
  }
}

module.exports = { inspectCustomerSupportDiagnostics }
