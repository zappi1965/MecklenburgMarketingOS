// POS-/Kassen-Anbindung: SumUp V1 + spaeter weitere Provider.
//
// Ziel fuer MMOS:
//   - kein eigenes Kassensystem ersetzen
//   - Umsaetze und Transaktionen aus externen Systemen anzeigen
//   - optionale Zuordnung zu Kunde, Termin, QR-Kampagne oder Loyalty
//   - spaeter: Zahlungen aus MMOS starten (nicht in V1)
//
// SumUp V1:
//   - Verbindung ueber Access Token / Merchant Code
//   - Transaktionshistorie abrufen
//   - in pos_transactions speichern
//   - Dashboard-Summary erzeugen

const crypto = require('crypto')

const PROVIDERS = ['sumup', 'lightspeed', 'gastrosoft', 'mock']

function getSupabaseAdminSafe() {
  try { return require('../lib/supabaseAdmin').getSupabaseAdmin() }
  catch (_) { return null }
}

function getTseServiceSafe() {
  try { return require('./tseService') }
  catch (_) { return null }
}

function clean(value) {
  const raw = String(value || '').trim().replace(/^['"]|['"]$/g, '')
  if (!raw || ['null','undefined','false','0','-'].includes(raw.toLowerCase())) return ''
  return raw
}

function isProvider(p) {
  return PROVIDERS.includes(String(p || '').toLowerCase())
}

function isoOrNull(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function dayStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

function sumupApiBase() {
  return clean(process.env.SUMUP_API_BASE) || 'https://api.sumup.com'
}

function sumupTransactionsEndpoint() {
  return clean(process.env.SUMUP_TRANSACTIONS_ENDPOINT) || '/v0.1/me/transactions/history'
}

// HMAC-SHA256-Verifikation. ENV-Variable: POS_<PROVIDER>_SECRET.
function verifySignature({ provider, payload, signature }) {
  const secretEnv = `POS_${String(provider || '').toUpperCase()}_SECRET`
  const secret = process.env[secretEnv]
  if (!secret || secret === 'mock') return true
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch (_) {
    return false
  }
}

function normalizeStatus(value) {
  const raw = String(value || '').toLowerCase()
  if (['successful', 'success', 'paid', 'completed', 'confirmed'].includes(raw)) return 'successful'
  if (['failed', 'declined', 'cancelled', 'canceled', 'error'].includes(raw)) return 'failed'
  if (['refunded', 'chargeback'].includes(raw)) return 'refunded'
  if (['pending', 'processing'].includes(raw)) return 'pending'
  return raw || 'pending'
}

// Wandelt SumUp-Webhook-Payload in unsere normierte Form.
function normalizeSumUp(body) {
  const tx = body?.data || body || {}
  return normalizeSumUpTransaction(tx)
}

function normalizeSumUpTransaction(tx = {}) {
  const amountValue = tx.amount ?? tx.amount_minor ?? tx.total_amount ?? tx.transaction_amount ?? 0
  const amount = Number(tx.amount_minor != null ? Number(tx.amount_minor) / 100 : amountValue)
  const id = tx.id || tx.transaction_id || tx.transaction_code || tx.code || tx.client_transaction_id || tx.checkout_id || tx.uuid || ''
  const time = tx.timestamp || tx.created_at || tx.local_time || tx.transaction_time || tx.payout_date || new Date().toISOString()
  const paymentType = tx.payment_type || tx.type || tx.entry_mode || tx.card_type || 'card'
  return {
    provider_transaction_id: String(id),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: tx.currency || tx.currency_code || 'EUR',
    payment_type: String(paymentType || 'card').toLowerCase(),
    status: normalizeStatus(tx.status || tx.payment_status || tx.state),
    transaction_time: isoOrNull(time) || new Date().toISOString(),
    reference: tx.reference || tx.description || tx.client_transaction_id || '',
    metadata: {
      merchant_code: tx.merchant_code || tx.merchant_id || null,
      reader_id: tx.reader_id || tx.card_reader_id || null,
      checkout_id: tx.checkout_id || null,
      payout_id: tx.payout_id || null,
      raw: tx
    }
  }
}

function normalize(provider, body) {
  switch (provider) {
    case 'sumup': return normalizeSumUp(body)
    case 'mock': return {
      provider_transaction_id: String(body?.id || `mock-${Date.now()}`),
      amount: Number(body?.amount || 0),
      currency: body?.currency || 'EUR',
      payment_type: body?.payment_type || 'card',
      status: normalizeStatus(body?.status || 'successful'),
      transaction_time: body?.transaction_time || new Date().toISOString(),
      reference: body?.reference || '',
      metadata: { raw: body }
    }
    default: {
      const e = new Error(`POS-Provider ${provider} noch nicht implementiert`)
      e.status = 501
      throw e
    }
  }
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function readSumUpConfig(supabase, { customer_id } = {}) {
  const envToken = clean(process.env.SUMUP_ACCESS_TOKEN)
  const envMerchant = clean(process.env.SUMUP_MERCHANT_CODE)
  const envBase = sumupApiBase()
  let record = null

  if (supabase && customer_id) {
    const fromFunctional = await safeQuery(
      supabase.from('v33_functional_records')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('resource', 'pos_provider_configs')
        .eq('local_id', `sumup_${customer_id}`)
        .maybeSingle()
    )
    if (fromFunctional.data) record = fromFunctional.data

    if (!record) {
      const fromIntegrations = await safeQuery(
        supabase.from('customer_integrations')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('provider', 'sumup')
          .maybeSingle()
      )
      if (fromIntegrations.data) record = fromIntegrations.data
    }
  }

  const payload = record?.payload || record?.metadata || record || {}
  const accessToken = clean(payload.access_token || payload.token || envToken)
  const merchantCode = clean(payload.merchant_code || payload.merchantCode || envMerchant)
  const apiBase = clean(payload.api_base || payload.apiBase || envBase) || envBase

  return {
    connected: Boolean(accessToken),
    source: accessToken && record ? 'customer_config' : accessToken ? 'env' : 'missing',
    provider: 'sumup',
    customer_id: customer_id || null,
    merchant_code: merchantCode || null,
    api_base: apiBase,
    access_token: accessToken,
    token_preview: accessToken ? `${accessToken.slice(0, 6)}…${accessToken.slice(-4)}` : null,
    config_record_id: record?.id || null,
    note: accessToken
      ? 'SumUp V1 ist fuer Umsatzdaten vorbereitet. MMOS ersetzt dadurch kein Kassensystem.'
      : 'SUMUP_ACCESS_TOKEN fehlt oder es ist keine kundenbezogene SumUp-Konfiguration gespeichert.'
  }
}

async function upsertSumUpConfig(supabase, { customer_id, access_token, merchant_code = '', api_base = '', actor = 'Admin' } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'Supabase/customer_id fehlt' }
  const token = clean(access_token)
  if (!token) return { ok: false, error: 'Access Token fehlt' }
  const now = new Date().toISOString()
  const payload = {
    provider: 'sumup',
    access_token: token,
    merchant_code: clean(merchant_code),
    api_base: clean(api_base) || sumupApiBase(),
    mode: 'revenue_readonly_v1',
    actor,
    connected_at: now,
    scope_note: 'V1 ruft nur Umsatz-/Transaktionsdaten ab. Keine Zahlungsausloesung, keine Kassenersetzung.'
  }
  const local_id = `sumup_${customer_id}`
  const existing = await safeQuery(
    supabase.from('v33_functional_records')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('resource', 'pos_provider_configs')
      .eq('local_id', local_id)
      .maybeSingle()
  )

  const record = {
    customer_id,
    resource: 'pos_provider_configs',
    local_id,
    title: 'SumUp Umsatzdaten-Anbindung',
    status: 'connected',
    payload,
    updated_at: now
  }

  let saved
  if (existing.data?.id) {
    saved = await safeQuery(supabase.from('v33_functional_records').update(record).eq('id', existing.data.id).select('*').maybeSingle())
  } else {
    saved = await safeQuery(supabase.from('v33_functional_records').insert({ ...record, created_at: now }).select('*').maybeSingle())
  }

  if (saved.error) return { ok: false, error: saved.error.message }
  return { ok: true, config: { ...payload, access_token: undefined, token_preview: `${token.slice(0, 6)}…${token.slice(-4)}` }, row: saved.data }
}

function extractSumUpTransactions(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.transactions)) return response.transactions
  if (Array.isArray(response?.transaction_events)) return response.transaction_events
  if (Array.isArray(response?.data)) return response.data
  return []
}

async function fetchSumUpTransactions({ access_token, merchant_code = '', api_base = '', from = null, to = null, limit = 100 } = {}) {
  const token = clean(access_token)
  if (!token) {
    const e = new Error('SumUp Access Token fehlt.')
    e.status = 400
    throw e
  }

  const url = new URL(sumupTransactionsEndpoint(), clean(api_base) || sumupApiBase())
  if (merchant_code) url.searchParams.set('merchant_code', merchant_code)
  if (from) url.searchParams.set('oldest_time', from)
  if (to) url.searchParams.set('newest_time', to)
  url.searchParams.set('limit', String(Math.min(Number(limit) || 100, 500)))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  })

  const text = await res.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch (_) { payload = { raw: text } }

  if (!res.ok) {
    const e = new Error(payload?.message || payload?.error || `SumUp API Fehler ${res.status}`)
    e.status = res.status
    e.details = payload
    throw e
  }

  return {
    ok: true,
    endpoint: url.pathname,
    count: extractSumUpTransactions(payload).length,
    raw: payload,
    transactions: extractSumUpTransactions(payload).map(normalizeSumUpTransaction)
  }
}

async function upsertPosTransaction(supabase, payload) {
  const existing = await safeQuery(
    supabase.from('pos_transactions')
      .select('id')
      .eq('provider', payload.provider)
      .eq('provider_transaction_id', payload.provider_transaction_id)
      .maybeSingle()
  )
  if (existing.data?.id) {
    const updated = await safeQuery(supabase.from('pos_transactions').update(payload).eq('id', existing.data.id).select('*').maybeSingle())
    if (updated.error) throw updated.error
    return { row: updated.data, action: 'updated' }
  }
  const inserted = await safeQuery(supabase.from('pos_transactions').insert(payload).select('*').maybeSingle())
  if (inserted.error) throw inserted.error
  return { row: inserted.data, action: 'inserted' }
}

async function syncSumUpTransactions(supabase, { customer_id, from = null, to = null, limit = 100 } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'Supabase/customer_id fehlt' }
  const config = await readSumUpConfig(supabase, { customer_id })
  if (!config.connected) return { ok: false, error: config.note, config: { ...config, access_token: undefined } }

  const fetched = await fetchSumUpTransactions({
    access_token: config.access_token,
    merchant_code: config.merchant_code,
    api_base: config.api_base,
    from,
    to,
    limit
  })

  const results = []
  for (const tx of fetched.transactions) {
    if (!tx.provider_transaction_id) continue
    const payload = {
      customer_id,
      provider: 'sumup',
      provider_transaction_id: tx.provider_transaction_id,
      amount: tx.amount,
      currency: tx.currency,
      payment_type: tx.payment_type,
      status: tx.status,
      transaction_time: tx.transaction_time,
      metadata: {
        ...tx.metadata,
        source: 'sumup_api_sync_v1',
        synced_at: new Date().toISOString(),
        reference: tx.reference || null
      }
    }
    const result = await upsertPosTransaction(supabase, payload)
    results.push(result)
  }

  return {
    ok: true,
    provider: 'sumup',
    customer_id,
    fetched: fetched.transactions.length,
    inserted: results.filter((r) => r.action === 'inserted').length,
    updated: results.filter((r) => r.action === 'updated').length,
    results: results.map((r) => r.row),
    config: { ...config, access_token: undefined }
  }
}

async function ingestWebhook({ provider, body, rawPayload, signature, customer_id_hint = null }) {
  const supabase = getSupabaseAdminSafe()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!isProvider(provider)) { const e = new Error('Unbekannter Provider'); e.status = 400; throw e }
  if (!verifySignature({ provider, payload: rawPayload, signature })) {
    const e = new Error('Webhook-Signatur ungueltig'); e.status = 401; throw e
  }
  const normalized = normalize(provider, body)
  if (!normalized.provider_transaction_id) {
    const e = new Error('provider_transaction_id fehlt'); e.status = 400; throw e
  }

  const customer_id = customer_id_hint || body?.customer_id || body?.data?.customer_id || null

  const upsertPayload = {
    customer_id,
    provider,
    provider_transaction_id: normalized.provider_transaction_id,
    amount: normalized.amount,
    currency: normalized.currency,
    payment_type: normalized.payment_type,
    status: normalized.status,
    transaction_time: normalized.transaction_time,
    metadata: normalized.metadata
  }

  const { row } = await upsertPosTransaction(supabase, upsertPayload)

  if (row && normalized.status === 'successful' && !row.tse_transaction_id) {
    try {
      const tseService = getTseServiceSafe()
      if (!tseService) return row
      const tse = await tseService.signTransaction({
        customer_id,
        source_type: 'pos_transaction',
        source_id: row.id,
        amount: row.amount,
        currency: row.currency,
        payment_type: row.payment_type === 'cash' ? 'Bar' : 'Karte'
      })
      await supabase.from('pos_transactions').update({ tse_transaction_id: tse?.id || null }).eq('id', row.id)
      row.tse_transaction_id = tse?.id || null
    } catch (e) {
      console.error('[posService] TSE-Sign fehlgeschlagen:', e?.message || e)
    }
  }
  return row
}

async function listTransactions(supabase, { customer_id, limit = 100, from = null, to = null } = {}) {
  if (!supabase || !customer_id) return []
  let query = supabase.from('pos_transactions').select('*').eq('customer_id', customer_id)
  if (from) query = query.gte('transaction_time', from)
  if (to) query = query.lte('transaction_time', to)
  const { data, error } = await query.order('transaction_time', { ascending: false }).limit(Math.min(Number(limit) || 100, 500))
  if (error) throw error
  return data || []
}

function summarizeTransactions(rows = []) {
  const today = dayStartIso()
  const month = monthStartIso()
  const successful = rows.filter((t) => normalizeStatus(t.status) === 'successful')
  const sum = (items) => items.reduce((s, t) => s + Number(t.amount || 0), 0)
  const byProvider = {}
  const byPaymentType = {}
  const daily = {}
  for (const t of successful) {
    byProvider[t.provider || 'unknown'] = (byProvider[t.provider || 'unknown'] || 0) + Number(t.amount || 0)
    byPaymentType[t.payment_type || 'unknown'] = (byPaymentType[t.payment_type || 'unknown'] || 0) + Number(t.amount || 0)
    const day = String(t.transaction_time || '').slice(0, 10) || 'unknown'
    daily[day] = (daily[day] || 0) + Number(t.amount || 0)
  }
  return {
    count: rows.length,
    successful_count: successful.length,
    total_revenue: Math.round(sum(successful) * 100) / 100,
    today_revenue: Math.round(sum(successful.filter((t) => String(t.transaction_time) >= today)) * 100) / 100,
    month_revenue: Math.round(sum(successful.filter((t) => String(t.transaction_time) >= month)) * 100) / 100,
    avg_transaction: successful.length ? Math.round((sum(successful) / successful.length) * 100) / 100 : 0,
    by_provider: byProvider,
    by_payment_type: byPaymentType,
    daily: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount: Math.round(Number(amount) * 100) / 100 }))
  }
}

async function getRevenueSummary(supabase, { customer_id, days = 90 } = {}) {
  const since = new Date(Date.now() - Math.max(Number(days) || 90, 1) * 86400000).toISOString()
  const rows = await listTransactions(supabase, { customer_id, from: since, limit: 1000 })
  return { ok: true, customer_id, days, summary: summarizeTransactions(rows), transactions: rows.slice(0, 100) }
}

async function linkTransaction(supabase, { transaction_id, customer_id, qr_campaign_id = null, appointment_id = null, loyalty_customer_id = null, lead_id = null, note = '', actor = 'Admin' } = {}) {
  if (!supabase || !transaction_id) return { ok: false, error: 'transaction_id fehlt' }
  const found = await safeQuery(supabase.from('pos_transactions').select('*').eq('id', transaction_id).maybeSingle())
  if (found.error || !found.data) return { ok: false, error: found.error?.message || 'Transaktion nicht gefunden' }
  if (customer_id && String(found.data.customer_id || '') !== String(customer_id)) return { ok: false, error: 'Transaktion gehoert nicht zu diesem Kunden.' }
  const metadata = {
    ...(found.data.metadata || {}),
    mmos_link: {
      qr_campaign_id,
      appointment_id,
      loyalty_customer_id,
      lead_id,
      note,
      actor,
      linked_at: new Date().toISOString()
    }
  }
  const updated = await safeQuery(supabase.from('pos_transactions').update({ metadata }).eq('id', transaction_id).select('*').maybeSingle())
  if (updated.error) return { ok: false, error: updated.error.message }
  return { ok: true, transaction: updated.data }
}

module.exports = {
  ingestWebhook,
  normalize,
  verifySignature,
  PROVIDERS,
  readSumUpConfig,
  upsertSumUpConfig,
  fetchSumUpTransactions,
  syncSumUpTransactions,
  listTransactions,
  getRevenueSummary,
  linkTransaction,
  summarizeTransactions,
  normalizeSumUpTransaction,
  _normalizeSumUp: normalizeSumUp
}
