async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function monthRange(month) {
  const now = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
  return { start: start.toISOString(), end: end.toISOString(), key }
}

function countRows(rows = [], predicate = () => true) { return rows.filter(predicate).length }

async function generateMonthlyCustomerReport(supabase, { customer_id, month = null, save = true } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt' }
  const range = monthRange(month)
  const since = range.start
  const until = range.end
  const [customer, qr, reviews, leads, tx, rewards, invoices] = await Promise.all([
    safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()),
    safeQuery(supabase.from('qr_campaigns').select('*').eq('customer_id', customer_id).limit(500)),
    safeQuery(supabase.from('review_feedback').select('*').eq('customer_id', customer_id).gte('created_at', since).lt('created_at', until).limit(1000)),
    safeQuery(supabase.from('prospect_leads').select('*').eq('customer_id', customer_id).gte('created_at', since).lt('created_at', until).limit(1000)),
    safeQuery(supabase.from('loyalty_transactions').select('*').eq('customer_id', customer_id).gte('created_at', since).lt('created_at', until).limit(2000)),
    safeQuery(supabase.from('loyalty_rewards').select('*').eq('customer_id', customer_id).limit(1000)),
    safeQuery(supabase.from('invoices').select('*').eq('customer_id', customer_id).gte('created_at', since).lt('created_at', until).limit(500))
  ])

  const txRows = tx.data || []
  const reviewRows = reviews.data || []
  const leadRows = leads.data || []
  const pointsEarned = txRows.filter((t) => Number(t.points || 0) > 0).reduce((sum, t) => sum + Number(t.points || 0), 0)
  const pointsRedeemed = Math.abs(txRows.filter((t) => Number(t.points || 0) < 0).reduce((sum, t) => sum + Number(t.points || 0), 0))
  const avgRating = reviewRows.length ? Math.round(reviewRows.reduce((s, r) => s + Number(r.rating || 0), 0) / reviewRows.length * 10) / 10 : null
  const invoiceAmount = (invoices.data || []).reduce((sum, i) => sum + Number(i.amount || i.total || 0), 0)

  const recommendations = []
  if ((qr.data || []).length === 0) recommendations.push('QR-Kampagne erstellen oder aktivieren.')
  if (reviewRows.length < 3) recommendations.push('Mehr Bewertungsanfragen über QR/Feedbackseite ausspielen.')
  if (leadRows.length === 0) recommendations.push('Lead-Quelle prüfen und Google Business Call-to-Action optimieren.')
  if (pointsEarned > 0 && pointsRedeemed === 0) recommendations.push('Reward-Kommunikation verbessern, damit Punkte eingelöst werden.')
  if (!recommendations.length) recommendations.push('System läuft stabil. Nächster Fokus: mehr Reichweite und wiederkehrende Besuche.')

  const report = {
    customer_id,
    customer_name: customer.data?.name || customer.data?.title || customer_id,
    month: range.key,
    period: { start: since, end: until },
    metrics: {
      qr_campaigns: (qr.data || []).length,
      review_count: reviewRows.length,
      avg_rating: avgRating,
      leads: leadRows.length,
      loyalty_transactions: txRows.length,
      points_earned: pointsEarned,
      points_redeemed: pointsRedeemed,
      active_rewards: countRows(rewards.data || [], (r) => r.active !== false),
      invoice_amount: invoiceAmount
    },
    recommendations,
    status: 'draft',
    generated_at: new Date().toISOString()
  }

  if (save) {
    const payload = {
      customer_id,
      title: `Monatsreport ${range.key}`,
      report_type: 'monthly_customer_report',
      status: 'draft',
      month: range.key,
      metrics: report.metrics,
      recommendations,
      metadata: report,
      created_at: new Date().toISOString()
    }
    let saved = await safeQuery(supabase.from('monthly_reports').insert(payload).select('*').maybeSingle())
    if (saved.error) saved = await safeQuery(supabase.from('output_documents').insert({ customer_id, title: payload.title, document_type: 'monthly_report', status: 'draft', metadata: report }).select('*').maybeSingle())
    report.saved = saved.error ? { ok: false, error: saved.error.message } : { ok: true, row: saved.data }
  }

  return { ok: true, report }
}

module.exports = { generateMonthlyCustomerReport }
