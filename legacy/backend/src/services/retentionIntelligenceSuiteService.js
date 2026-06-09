async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

const SEGMENT_TEMPLATES = [
  { key: 'new_customers', label: 'Neukunden', rules: { max_visits: 1 } },
  { key: 'regular_customers', label: 'Stammkunden', rules: { min_visits: 5, max_inactive_days: 45 } },
  { key: 'vip_customers', label: 'VIP-Kunden', rules: { min_points: 750 } },
  { key: 'inactive_customers', label: 'Inaktive Kunden', rules: { min_inactive_days: 45 } },
  { key: 'at_risk_customers', label: 'Risiko-Kunden', rules: { min_churn_score: 65 } },
  { key: 'coupon_users', label: 'Gutschein-Nutzer', rules: { min_coupon_events: 1 } },
  { key: 'high_value_customers', label: 'Hoher Kundenwert', rules: { min_value_score: 70 } },
  { key: 'critical_feedback_customers', label: 'Kritische Kunden', rules: { max_rating: 3 } }
]

const ACTION_TEMPLATES = [
  { key: 'winback_coupon', label: 'Comeback-Angebot', action: 'Reaktivierungsangebot vorbereiten', message: 'Wir vermissen dich – sichere dir deinen Comeback-Vorteil.' },
  { key: 'personal_followup', label: 'Persönliche Rückmeldung', action: 'Nachfass-Aufgabe erstellen', message: 'Persönlich nachfassen und Hürde klären.' },
  { key: 'vip_upgrade', label: 'VIP-Aufwertung', action: 'VIP-Vorteil prüfen', message: 'Als besonders treuer Kunde erhältst du einen exklusiven Vorteil.' },
  { key: 'feedback_recovery', label: 'Service Recovery', action: 'Beschwerde/Kritik bearbeiten', message: 'Danke für dein Feedback – wir kümmern uns darum.' },
  { key: 'reward_reminder', label: 'Reward Reminder', action: 'Reward-Erinnerung vorbereiten', message: 'Du hast noch Vorteile offen – jetzt einlösen.' },
  { key: 'birthday_bonus', label: 'Geburtstagsbonus', action: 'Geburtstagsvorteil vorbereiten', message: 'Alles Gute – dein Geburtstagsvorteil wartet.' }
]

function nowIso() { return new Date().toISOString() }

function toDate(value) {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function daysSince(value) {
  const d = toDate(value)
  if (!d) return 9999
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
}

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function memberId(row = {}) {
  return String(row.id || row.loyalty_member_id || row.member_id || row.email || row.phone || '').trim()
}

function memberDisplay(row = {}) {
  return row.display_name || row.name || row.full_name || row.email || row.phone || memberId(row) || 'Unbekannter Endkunde'
}

function buildMemberStats(members = [], txRows = [], reviewRows = [], couponRows = []) {
  const byId = new Map()
  for (const m of members) {
    const id = memberId(m)
    if (!id) continue
    byId.set(id, {
      id,
      customer_id: m.customer_id,
      display_name: memberDisplay(m),
      email: m.email || null,
      phone: m.phone || null,
      consent_marketing: Boolean(m.consent_marketing || m.marketing_consent || m.metadata?.consent_marketing),
      consent_service: m.consent_service !== false,
      points_balance: num(m.points_balance ?? m.points ?? m.balance, 0),
      visits: num(m.visits ?? m.visit_count ?? m.metadata?.visits, 0),
      last_activity_at: m.last_activity_at || m.updated_at || m.created_at || null,
      status: m.status || 'active',
      raw: m,
      transactions: [],
      reviews: [],
      coupons: []
    })
  }

  for (const t of txRows) {
    const id = String(t.loyalty_member_id || t.member_id || t.email || t.phone || '').trim()
    if (!id) continue
    if (!byId.has(id)) byId.set(id, { id, display_name: id, points_balance: 0, visits: 0, last_activity_at: t.created_at, status: 'active', transactions: [], reviews: [], coupons: [], raw: {} })
    const s = byId.get(id)
    s.transactions.push(t)
    s.points_balance += num(t.points || 0, 0)
    if (String(t.action || t.event_type || '').toLowerCase().includes('visit')) s.visits += 1
    if (toDate(t.created_at) && daysSince(t.created_at) < daysSince(s.last_activity_at)) s.last_activity_at = t.created_at
  }

  for (const r of reviewRows) {
    const id = String(r.loyalty_member_id || r.member_id || r.email || r.phone || '').trim()
    if (!id) continue
    if (!byId.has(id)) byId.set(id, { id, display_name: id, points_balance: 0, visits: 0, last_activity_at: r.created_at, status: 'active', transactions: [], reviews: [], coupons: [], raw: {} })
    byId.get(id).reviews.push(r)
  }

  for (const c of couponRows) {
    const id = String(c.payload?.loyalty_member_id || c.loyalty_member_id || '').trim()
    if (id && byId.has(id)) byId.get(id).coupons.push(c)
  }

  return Array.from(byId.values()).map((s) => {
    s.days_inactive = daysSince(s.last_activity_at)
    s.last_rating = s.reviews.length ? num(s.reviews[0].rating, null) : null
    s.avg_rating = s.reviews.length ? Math.round(s.reviews.reduce((a, r) => a + num(r.rating, 0), 0) / s.reviews.length * 10) / 10 : null
    s.reward_redemptions = s.transactions.filter((t) => num(t.points, 0) < 0 || String(t.action || '').includes('redeem')).length
    s.positive_events = s.transactions.filter((t) => num(t.points, 0) > 0).length
    return s
  })
}

function churnScoreFor(member) {
  let score = 0
  const reasons = []
  if (member.days_inactive >= 90) { score += 45; reasons.push('seit mindestens 90 Tagen inaktiv') }
  else if (member.days_inactive >= 60) { score += 35; reasons.push('seit mindestens 60 Tagen inaktiv') }
  else if (member.days_inactive >= 45) { score += 25; reasons.push('seit mindestens 45 Tagen inaktiv') }
  else if (member.days_inactive >= 30) { score += 15; reasons.push('seit mindestens 30 Tagen inaktiv') }

  if (member.visits >= 5 && member.days_inactive >= 30) { score += 20; reasons.push('früher aktiv, jetzt rückläufig') }
  if (member.points_balance > 0 && member.reward_redemptions === 0) { score += 12; reasons.push('Punkte vorhanden, aber keine Einlösung') }
  if (member.last_rating !== null && member.last_rating <= 3) { score += 25; reasons.push('kritisches Feedback abgegeben') }
  if (String(member.status || '').toLowerCase().includes('inactive')) { score += 10; reasons.push('Status inaktiv') }

  return { score: Math.min(100, score), reasons }
}

function valueScoreFor(member) {
  const visits = Math.min(35, member.visits * 5)
  const points = Math.min(25, Math.max(0, member.points_balance) / 25)
  const redemption = Math.min(15, member.reward_redemptions * 5)
  const rating = member.avg_rating ? Math.min(15, member.avg_rating * 3) : 0
  const recency = member.days_inactive <= 14 ? 10 : member.days_inactive <= 30 ? 5 : 0
  const score = Math.round(Math.min(100, visits + points + redemption + rating + recency))
  const reasons = [
    `${member.visits} Besuche/Aktivitäten`,
    `${member.points_balance} Punkte`,
    `${member.reward_redemptions} Reward-Einlösungen`,
    member.avg_rating ? `${member.avg_rating} Sterne Ø` : 'keine Bewertungsdaten',
    `letzte Aktivität vor ${member.days_inactive} Tagen`
  ]
  return { score, reasons }
}

function segmentKeysFor(member, churn, value) {
  const segs = []
  if (member.visits <= 1) segs.push('new_customers')
  if (member.visits >= 5 && member.days_inactive <= 45) segs.push('regular_customers')
  if (member.points_balance >= 750 || value.score >= 80) segs.push('vip_customers')
  if (member.days_inactive >= 45) segs.push('inactive_customers')
  if (churn.score >= 65) segs.push('at_risk_customers')
  if (member.coupons.length > 0) segs.push('coupon_users')
  if (value.score >= 70) segs.push('high_value_customers')
  if (member.last_rating !== null && member.last_rating <= 3) segs.push('critical_feedback_customers')
  return segs
}

function nextActionsFor(member, churn, value) {
  const actions = []
  if (member.days_inactive >= 45) actions.push({ ...ACTION_TEMPLATES.find((a) => a.key === 'winback_coupon'), priority: member.days_inactive >= 90 ? 'high' : 'medium' })
  if (churn.score >= 65) actions.push({ ...ACTION_TEMPLATES.find((a) => a.key === 'personal_followup'), priority: 'high' })
  if (member.last_rating !== null && member.last_rating <= 3) actions.push({ ...ACTION_TEMPLATES.find((a) => a.key === 'feedback_recovery'), priority: 'high' })
  if (member.points_balance > 0 && member.reward_redemptions === 0) actions.push({ ...ACTION_TEMPLATES.find((a) => a.key === 'reward_reminder'), priority: 'medium' })
  if (value.score >= 80) actions.push({ ...ACTION_TEMPLATES.find((a) => a.key === 'vip_upgrade'), priority: 'low' })
  return actions
}

async function loadRetentionData(supabase, customer_id) {
  const [members, tx, reviews, records] = await Promise.all([
    safeQuery(supabase.from('loyalty_members').select('*').eq('customer_id', customer_id).limit(5000)),
    safeQuery(supabase.from('loyalty_transactions').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(10000)),
    safeQuery(supabase.from('review_feedback').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(5000)),
    safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customer_id).in('resource', ['coupon_wallets','retention_recommendations','feedback_action_items','service_recovery_cases','customer_segments','customer_value_scores','churn_risk_scores']).order('created_at', { ascending: false }).limit(10000))
  ])

  const recordRows = records.data || []
  const couponRows = recordRows.filter((r) => r.resource === 'coupon_wallets')
  return {
    members: members.data || [],
    transactions: tx.data || [],
    reviews: reviews.data || [],
    records: recordRows,
    memberStats: buildMemberStats(members.data || [], tx.data || [], reviews.data || [], couponRows),
    errors: [members.error, tx.error, reviews.error, records.error].filter(Boolean).map((e) => e.message)
  }
}

async function calculateRetentionIntelligence(supabase, { customer_id, persist = false } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const data = await loadRetentionData(supabase, customer_id)
  const members = data.memberStats.map((m) => {
    const churn = churnScoreFor(m)
    const value = valueScoreFor(m)
    const segments = segmentKeysFor(m, churn, value)
    const next_actions = nextActionsFor(m, churn, value)
    return {
      id: m.id,
      display_name: m.display_name,
      email: m.email,
      phone: m.phone,
      consent_marketing: m.consent_marketing,
      points_balance: m.points_balance,
      visits: m.visits,
      last_activity_at: m.last_activity_at,
      days_inactive: m.days_inactive,
      churn_score: churn.score,
      churn_reasons: churn.reasons,
      value_score: value.score,
      value_reasons: value.reasons,
      segments,
      next_actions
    }
  })

  const inactive = members.filter((m) => m.days_inactive >= 45)
  const shouldReactivate = members.filter((m) => m.churn_score >= 45 || m.days_inactive >= 45)
  const criticalFeedback = members.filter((m) => m.segments.includes('critical_feedback_customers'))
  const vip = members.filter((m) => m.value_score >= 80 || m.segments.includes('vip_customers'))

  const segmentCounts = {}
  for (const m of members) for (const s of m.segments) segmentCounts[s] = (segmentCounts[s] || 0) + 1

  const recommendations = []
  if (inactive.length) recommendations.push({ priority: 'high', type: 'reactivation', title: `${inactive.length} inaktive Kunden reaktivieren`, action: 'Winback-Kampagne erstellen', suggestion: 'Comeback-Gutschein oder persönliche Nachricht vorbereiten.' })
  if (criticalFeedback.length) recommendations.push({ priority: 'high', type: 'service_recovery', title: `${criticalFeedback.length} kritische Feedbackfälle prüfen`, action: 'Service Recovery starten', suggestion: 'Beschwerdefälle intern bearbeiten und Nachfassaktion planen.' })
  if (vip.length) recommendations.push({ priority: 'medium', type: 'vip', title: `${vip.length} VIP-Kunden pflegen`, action: 'VIP-Vorteil vorbereiten', suggestion: 'Exklusiven Bonus oder Club-Vorteil anbieten.' })
  if (!recommendations.length) recommendations.push({ priority: 'low', type: 'stable', title: 'Kundenbindung stabil', action: 'Monatskampagne planen', suggestion: 'Nächste saisonale Kampagne oder Reward-A/B-Test starten.' })

  const result = {
    ok: data.errors.length === 0,
    customer_id,
    generated_at: nowIso(),
    metrics: {
      members: members.length,
      inactive_members: inactive.length,
      reactivation_candidates: shouldReactivate.length,
      critical_feedback_customers: criticalFeedback.length,
      vip_candidates: vip.length,
      avg_churn_score: members.length ? Math.round(members.reduce((a, m) => a + m.churn_score, 0) / members.length) : 0,
      avg_value_score: members.length ? Math.round(members.reduce((a, m) => a + m.value_score, 0) / members.length) : 0
    },
    segment_templates: SEGMENT_TEMPLATES,
    segment_counts: segmentCounts,
    recommendations,
    members: members.sort((a, b) => b.churn_score - a.churn_score).slice(0, 200),
    reactivation_candidates: shouldReactivate.sort((a, b) => b.churn_score - a.churn_score).slice(0, 100),
    vip_candidates: vip.sort((a, b) => b.value_score - a.value_score).slice(0, 100),
    errors: data.errors
  }

  if (persist) await persistRetentionSnapshot(supabase, result)
  return result
}

async function persistRetentionSnapshot(supabase, intelligence) {
  const now = nowIso()
  const rows = []
  for (const m of intelligence.members || []) {
    rows.push({ resource: 'churn_risk_scores', local_id: `churn_${m.id}`, customer_id: intelligence.customer_id, title: `Churn ${m.display_name}`, status: m.churn_score >= 65 ? 'high_risk' : m.churn_score >= 45 ? 'medium_risk' : 'low_risk', payload: { member_id: m.id, score: m.churn_score, reasons: m.churn_reasons, days_inactive: m.days_inactive, next_actions: m.next_actions }, updated_at: now })
    rows.push({ resource: 'customer_value_scores', local_id: `value_${m.id}`, customer_id: intelligence.customer_id, title: `Value ${m.display_name}`, status: m.value_score >= 80 ? 'vip' : m.value_score >= 50 ? 'valuable' : 'normal', payload: { member_id: m.id, score: m.value_score, reasons: m.value_reasons, segments: m.segments }, updated_at: now })
    for (const segment of m.segments) {
      rows.push({ resource: 'customer_segment_memberships', local_id: `${segment}_${m.id}`, customer_id: intelligence.customer_id, title: `${segment}: ${m.display_name}`, status: 'active', payload: { segment, member_id: m.id, reason: m.segments }, updated_at: now })
    }
  }
  for (const rec of intelligence.recommendations || []) {
    rows.push({ resource: 'retention_recommendations', local_id: `rec_${rec.type}_${now.slice(0,10)}`, customer_id: intelligence.customer_id, title: rec.title, status: 'open', payload: rec, updated_at: now })
  }
  let saved = 0
  for (const row of rows.slice(0, 2000)) {
    const existing = await safeQuery(supabase.from('v33_functional_records').select('id').eq('resource', row.resource).eq('customer_id', row.customer_id).eq('local_id', row.local_id).maybeSingle())
    const payload = { ...row, created_at: existing.data?.id ? undefined : now }
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
    const res = existing.data?.id
      ? await safeQuery(supabase.from('v33_functional_records').update(payload).eq('id', existing.data.id))
      : await safeQuery(supabase.from('v33_functional_records').insert(payload))
    if (!res.error) saved += 1
  }
  return { ok: true, saved }
}

async function createSegmentsFromTemplates(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = nowIso()
  const created = []
  for (const seg of SEGMENT_TEMPLATES) {
    const local_id = `segment_${seg.key}`
    const row = { resource: 'customer_segments', local_id, customer_id, title: seg.label, status: 'active', payload: { ...seg, created_at: now }, updated_at: now }
    const existing = await safeQuery(supabase.from('v33_functional_records').select('id').eq('resource','customer_segments').eq('customer_id', customer_id).eq('local_id', local_id).maybeSingle())
    const saved = existing.data?.id
      ? await safeQuery(supabase.from('v33_functional_records').update(row).eq('id', existing.data.id).select('*').maybeSingle())
      : await safeQuery(supabase.from('v33_functional_records').insert({ ...row, created_at: now }).select('*').maybeSingle())
    created.push(saved.error ? { ok: false, key: seg.key, error: saved.error.message } : { ok: true, key: seg.key, segment: saved.data })
  }
  return { ok: created.every((c) => c.ok), created }
}

function feedbackCategory(text = '', rating = null) {
  const t = String(text || '').toLowerCase()
  if (t.includes('warte') || t.includes('lange')) return 'Wartezeit'
  if (t.includes('preis') || t.includes('teuer')) return 'Preis'
  if (t.includes('unfreund') || t.includes('service') || t.includes('mitarbeiter')) return 'Service'
  if (t.includes('qualität') || t.includes('schlecht') || t.includes('kaputt')) return 'Qualität'
  if (rating !== null && Number(rating) <= 3) return 'Kritisches Feedback'
  return 'Allgemein'
}

async function generateFeedbackActionBoard(supabase, { customer_id, persist = true } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const reviews = await safeQuery(supabase.from('review_feedback').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(500))
  if (reviews.error) return { ok: false, error: reviews.error.message, actions: [] }
  const actions = (reviews.data || []).filter((r) => Number(r.rating || 0) <= 3 || String(r.message || r.feedback || r.comment || '').trim()).map((r) => {
    const rating = r.rating !== undefined ? Number(r.rating) : null
    const text = r.message || r.feedback || r.comment || ''
    const category = feedbackCategory(text, rating)
    const priority = rating !== null && rating <= 2 ? 'high' : rating === 3 ? 'medium' : 'low'
    return {
      id: `fb_action_${r.id}`,
      customer_id,
      feedback_id: r.id,
      loyalty_member_id: r.loyalty_member_id || null,
      category,
      priority,
      task: priority === 'high' ? `${category} dringend prüfen und Service Recovery starten` : `${category} prüfen`,
      status: 'open',
      feedback_excerpt: String(text).slice(0, 240),
      rating,
      created_at: nowIso()
    }
  })
  let saved = 0
  if (persist) {
    for (const a of actions) {
      const row = { resource: 'feedback_action_items', local_id: a.id, customer_id, title: a.task, status: a.status, payload: a, updated_at: nowIso() }
      const existing = await safeQuery(supabase.from('v33_functional_records').select('id').eq('resource','feedback_action_items').eq('customer_id', customer_id).eq('local_id', a.id).maybeSingle())
      const res = existing.data?.id
        ? await safeQuery(supabase.from('v33_functional_records').update(row).eq('id', existing.data.id))
        : await safeQuery(supabase.from('v33_functional_records').insert({ ...row, created_at: nowIso() }))
      if (!res.error) saved += 1
    }
  }
  return { ok: true, actions, saved }
}

async function createServiceRecoveryCase(supabase, payload = {}) {
  if (!supabase || !payload.customer_id) return { ok: false, error: 'customer_id fehlt' }
  const now = nowIso()
  const local_id = payload.id || `recovery_${payload.feedback_id || Date.now()}_${Math.random().toString(16).slice(2)}`
  const c = {
    id: local_id,
    customer_id: payload.customer_id,
    loyalty_member_id: payload.loyalty_member_id || null,
    feedback_id: payload.feedback_id || null,
    issue_type: payload.issue_type || 'Kritisches Feedback',
    priority: payload.priority || 'high',
    status: payload.status || 'open',
    proposed_solution: payload.proposed_solution || 'Persönlich nachfassen, Entschuldigung vorbereiten und Kulanzcoupon prüfen.',
    contact_allowed: Boolean(payload.contact_allowed),
    coupon_suggestion: payload.coupon_suggestion || 'Comeback-Vorteil / Kulanzcoupon',
    assigned_to: payload.assigned_to || null,
    notes: payload.notes || '',
    created_at: now,
    updated_at: now
  }
  const row = { resource: 'service_recovery_cases', local_id, customer_id: c.customer_id, title: c.issue_type, status: c.status, payload: c, created_at: now, updated_at: now }
  const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, recovery_case: { ...c, record_id: saved.data?.id } }
}

async function createReactivationPlan(supabase, { customer_id, persist = true } = {}) {
  const intelligence = await calculateRetentionIntelligence(supabase, { customer_id, persist: false })
  if (!intelligence.ok && !intelligence.reactivation_candidates) return intelligence
  const candidates = intelligence.reactivation_candidates || []
  const plan = {
    id: `reactivation_${customer_id}_${nowIso().slice(0,10)}`,
    customer_id,
    title: 'Reaktivierungsplan',
    status: 'draft',
    created_at: nowIso(),
    candidates: candidates.slice(0, 50).map((m) => ({
      member_id: m.id,
      display_name: m.display_name,
      days_inactive: m.days_inactive,
      churn_score: m.churn_score,
      reasons: m.churn_reasons,
      contact_allowed: Boolean(m.consent_marketing || m.email || m.phone),
      proposed_action: m.consent_marketing ? 'Winback-Nachricht mit Comeback-Vorteil vorbereiten' : 'Nur im Betrieb/bei nächstem Kontakt reaktivieren; keine Werbenachricht ohne Einwilligung',
      concrete_offer: m.days_inactive >= 90 ? 'Starker Comeback-Bonus / persönlicher Vorteil' : 'Kleiner Comeback-Coupon oder Reward-Erinnerung',
      message_draft: m.consent_marketing ? `Hallo ${m.display_name}, wir vermissen dich. Dein Comeback-Vorteil wartet auf dich.` : ''
    }))
  }
  if (persist) {
    const row = { resource: 'retention_reactivation_plans', local_id: plan.id, customer_id, title: plan.title, status: plan.status, payload: plan, created_at: nowIso(), updated_at: nowIso() }
    const saved = await safeQuery(supabase.from('v33_functional_records').insert(row).select('*').maybeSingle())
    plan.saved = saved.error ? { ok: false, error: saved.error.message } : { ok: true, record_id: saved.data?.id }
  }
  return { ok: true, plan }
}

module.exports = {
  SEGMENT_TEMPLATES,
  ACTION_TEMPLATES,
  calculateRetentionIntelligence,
  createSegmentsFromTemplates,
  generateFeedbackActionBoard,
  createServiceRecoveryCase,
  createReactivationPlan,
  churnScoreFor,
  valueScoreFor
}
