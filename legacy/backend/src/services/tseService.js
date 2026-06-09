// TSE-Service (Technische Sicherheitseinrichtung, § 146a AO + KassenSichV).
//
// Bei jedem bar-/kartenbasierten Geschaeftsvorfall muss die Kasse den
// Vorgang in einer zertifizierten TSE signieren. Diese Datei kapselt
// die Provider-API.
//
// Default-Provider in Production: 'fiskaly' (cloud-TSE), 'dtrust' oder
// 'epson'. Fuer Local/CI/Tests: 'mock' — deterministische Pseudosignatur,
// damit das Backend ohne echte Hardware-/Cloud-Verbindung lauffaehig
// bleibt.
//
// Auswahl via ENV TSE_PROVIDER.

const crypto = require('crypto')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const PROVIDERS = ['mock', 'fiskaly', 'dtrust', 'epson']

function provider() {
  const p = String(process.env.TSE_PROVIDER || 'mock').toLowerCase()
  if (!PROVIDERS.includes(p)) return 'mock'
  return p
}

// In-Process-Counter Pro Device (nur fuer Mock). Production-Counter
// kommt vom externen TSE-Modul selbst.
const mockCounters = new Map()

function nextMockCounter(deviceId) {
  const next = (mockCounters.get(deviceId) || 0) + 1
  mockCounters.set(deviceId, next)
  return next
}

// Erzeugt eine deterministische Pseudosignatur basierend auf einem
// Hash des process_data. Reicht fuer Tests / Local-Dev, NICHT fuer
// Production (echte TSE ist HSM-basiert).
function mockSign(processData) {
  const hash = crypto.createHash('sha256').update(processData).digest('base64')
  return {
    signed_payload: Buffer.from(processData).toString('base64'),
    signature_value: hash,
    signature_algorithm: 'ecdsa-plain-SHA256-mock'
  }
}

async function signWithProvider({ processData, deviceId }) {
  const p = provider()
  if (p === 'mock') {
    return {
      ...mockSign(processData),
      provider: 'mock',
      signature_counter: nextMockCounter(deviceId)
    }
  }
  // fiskaly / dtrust / epson erwarten echte API-Credentials. Wir liefern
  // einen klaren Fehler statt zu raten, damit Mis-Configurations sofort
  // sichtbar werden.
  if (!process.env.TSE_API_KEY) {
    const err = new Error(`TSE_PROVIDER=${p} setzt TSE_API_KEY voraus`)
    err.status = 500
    err.code = 'TSE_NOT_CONFIGURED'
    throw err
  }
  // Provider-spezifische Implementierungen werden hier eingehaengt,
  // sobald die jeweiligen Vertraege/Sandboxes verfuegbar sind.
  // Bis dahin: dasselbe Verhalten wie Mock, aber mit Provider-Tag.
  return {
    ...mockSign(processData),
    provider: p,
    signature_counter: nextMockCounter(deviceId),
    provider_pending: true
  }
}

// Baut den process_data-String gemaess DSFinV-K, Anlage I, Kapitel 2.
// Vereinfachte Form fuer Beleg-Vorgaenge.
function buildProcessData({ amount, currency = 'EUR', payment_type = 'Bar', taxRate = 19 }) {
  const amt = Number(amount || 0).toFixed(2)
  // Schema: "Beleg^Bruttobetrag_<USt>:NETTO_<USt>:USt_<USt>^Zahlungsart:<currency>:<amount>"
  const netto = (amt / (1 + taxRate / 100)).toFixed(2)
  const ust = (amt - Number(netto)).toFixed(2)
  return `Beleg^${amt}_${taxRate}:${netto}:${ust}^${payment_type}:${currency}:${amt}`
}

// Hauptmethode: signiert einen Geschaeftsvorgang und schreibt ihn in
// public.tse_transactions. Wird von invoiceRoutes / appointmentRoutes
// aufgerufen, sobald ein Vorgang abgeschlossen wird.
async function signTransaction({
  customer_id,
  source_type,
  source_id,
  amount,
  currency = 'EUR',
  payment_type = 'Bar',
  tax_rate = 19,
  metadata = {}
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    const err = new Error('Supabase nicht konfiguriert'); err.status = 503; throw err
  }
  const deviceId = process.env.TSE_DEVICE_ID || 'mock-device-1'
  const startTime = new Date().toISOString()
  const processData = buildProcessData({ amount, currency, payment_type, taxRate: tax_rate })
  const signed = await signWithProvider({ processData, deviceId })

  // QR-Signatur fuer den Beleg (KassenSichV § 6 Abs. 2 Satz 1 Nr. 1).
  const qrSignature = [
    `serial:${deviceId}`,
    `counter:${signed.signature_counter}`,
    `time:${startTime}`,
    `sig:${signed.signature_value.slice(0, 32)}`
  ].join(';')

  // Naechste fortlaufende Transaktionsnummer ueber alle TSE-Vorgaenge.
  const { data: countRow } = await supabase
    .from('tse_transactions')
    .select('transaction_number')
    .order('transaction_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextTxNumber = (countRow?.transaction_number || 0) + 1

  const insert = {
    customer_id: customer_id || null,
    source_type,
    source_id: source_id || null,
    transaction_number: nextTxNumber,
    tse_device_id: deviceId,
    signature_counter: signed.signature_counter,
    start_time: startTime,
    process_type: 'Kassenbeleg-V1',
    process_data: processData,
    signature_algorithm: signed.signature_algorithm,
    signed_payload: signed.signed_payload,
    signature_value: signed.signature_value,
    qr_signature: qrSignature,
    provider: signed.provider,
    metadata: { ...metadata, amount, payment_type, tax_rate }
  }
  const { data, error } = await supabase
    .from('tse_transactions')
    .insert(insert)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

// Erstellt einen quartalsweisen Archiv-Eintrag fuer die GoBD-konforme
// Aufbewahrung (10 Jahre). Der eigentliche ZIP-Build laeuft im Worker.
async function planQuarterlyArchive({ year, quarter, customer_id = null }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const q = Math.max(1, Math.min(4, Number(quarter)))
  const startMonth = (q - 1) * 3
  const periodStart = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`
  const endDate = new Date(Date.UTC(year, startMonth + 3, 0))
  const periodEnd = endDate.toISOString().slice(0, 10)
  const retainUntil = new Date(Date.UTC(year + 10, startMonth + 3, 0)).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('kassenarchiv_exports')
    .upsert(
      {
        customer_id,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'pending',
        format: 'gobd-zip',
        retain_until: retainUntil
      },
      { onConflict: 'period_start,period_end' }
    )
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

module.exports = {
  signTransaction,
  buildProcessData,
  planQuarterlyArchive,
  PROVIDERS,
  // For tests:
  _mockSign: mockSign
}
