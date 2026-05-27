// POS-Bridge: SumUp + spaeter Lightspeed / GastroSoft.
//
// Funktionsweise:
//   - Externes POS feuert Webhook bei jeder Transaktion an unseren
//     Endpoint /api/pos/webhook/:provider.
//   - Webhook-Body wird signaturverifiziert (HMAC-SHA256 mit pro Provider
//     hinterlegtem Secret in ENV).
//   - Transaktion landet in pos_transactions, wird optional auf einen
//     Customer gematcht (Provider-Konfig).
//   - Erfolgreiche Bar-/Karten-Zahlung triggert TSE-Sign + erstellt eine
//     invoices-Zeile (wenn customer_id bekannt).
//
// Mock-Modus fuer Tests: keine Signatur-Pruefung, KEY=mock akzeptiert
// jedes Payload.

const crypto = require('crypto')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const tseService = require('./tseService')

const PROVIDERS = ['sumup', 'lightspeed', 'gastrosoft', 'mock']

function isProvider(p) {
  return PROVIDERS.includes(String(p || '').toLowerCase())
}

// HMAC-SHA256-Verifikation. SumUp signiert webhooks mit dem im Dashboard
// hinterlegten Secret. ENV-Variable: POS_<PROVIDER>_SECRET.
function verifySignature({ provider, payload, signature }) {
  const secretEnv = `POS_${provider.toUpperCase()}_SECRET`
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

// Wandelt SumUp-Webhook-Payload in unsere normierte Form.
function normalizeSumUp(body) {
  const tx = body?.data || body || {}
  return {
    provider_transaction_id: String(tx.id || tx.transaction_id || tx.transaction_code || ''),
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'EUR',
    payment_type: tx.payment_type || 'card',
    status: String(tx.status || 'pending').toLowerCase(),
    transaction_time: tx.timestamp || tx.created_at || new Date().toISOString(),
    metadata: { reader_id: tx.reader_id || null, raw: tx }
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
      status: String(body?.status || 'successful').toLowerCase(),
      transaction_time: body?.transaction_time || new Date().toISOString(),
      metadata: { raw: body }
    }
    default: {
      const e = new Error(`POS-Provider ${provider} noch nicht implementiert`); e.status = 501; throw e
    }
  }
}

async function ingestWebhook({ provider, body, rawPayload, signature, customer_id_hint = null }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  if (!isProvider(provider)) { const e = new Error('Unbekannter Provider'); e.status = 400; throw e }
  if (!verifySignature({ provider, payload: rawPayload, signature })) {
    const e = new Error('Webhook-Signatur ungueltig'); e.status = 401; throw e
  }
  const normalized = normalize(provider, body)
  if (!normalized.provider_transaction_id) {
    const e = new Error('provider_transaction_id fehlt'); e.status = 400; throw e
  }

  // Resolve customer_id ueber Hint oder optional ueber Provider-Metadata.
  const customer_id = customer_id_hint || body?.customer_id || null

  // Idempotenz: existierender Eintrag wird upserted.
  const { data: existing } = await supabase
    .from('pos_transactions')
    .select('id, status, invoice_id, tse_transaction_id')
    .eq('provider', provider).eq('provider_transaction_id', normalized.provider_transaction_id)
    .maybeSingle()

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

  let row
  if (existing) {
    const { data, error } = await supabase
      .from('pos_transactions')
      .update(upsertPayload)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle()
    if (error) throw error
    row = data
  } else {
    const { data, error } = await supabase
      .from('pos_transactions')
      .insert(upsertPayload)
      .select('*')
      .maybeSingle()
    if (error) throw error
    row = data
  }

  // Bei erfolgreicher Karten-/Bar-Zahlung: TSE-Signatur + Backfill.
  if (row && normalized.status === 'successful' && !row.tse_transaction_id) {
    try {
      const tse = await tseService.signTransaction({
        customer_id,
        source_type: 'pos_transaction',
        source_id: row.id,
        amount: row.amount,
        currency: row.currency,
        payment_type: row.payment_type === 'cash' ? 'Bar' : 'Karte'
      })
      await supabase
        .from('pos_transactions')
        .update({ tse_transaction_id: tse?.id || null })
        .eq('id', row.id)
      row.tse_transaction_id = tse?.id || null
    } catch (e) {
      // TSE-Fehler darf den Webhook nicht failen lassen — wird im
      // Sweep-Job re-versucht.
      console.error('[posService] TSE-Sign fehlgeschlagen:', e?.message || e)
    }
  }
  return row
}

module.exports = {
  ingestWebhook,
  normalize,
  verifySignature,
  PROVIDERS,
  // Test helpers:
  _normalizeSumUp: normalizeSumUp
}
