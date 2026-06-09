// DATEV-/lexoffice-/sevDesk-Export.
//
// Formate:
//   - datev_extf    Flach-CSV nach DATEV-EXTF-Format (Buchungsstapel)
//   - lexoffice_csv lexoffice-Import-CSV
//   - sevdesk_csv   sevDesk-Import-CSV
//
// Quelle: public.invoices fuer den Zeitraum [period_start, period_end].

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

function ddmmyyyy(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}${mm}${d.getFullYear()}`
}

function csvEscape(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function joinCsv(row, sep = ';') {
  return row.map(csvEscape).join(sep)
}

// DATEV EXTF — Buchungsstapel (vereinfacht, 13 Pflichtspalten).
function buildDatevExtf({ invoices, periodStart, periodEnd, accountingFromAccount = '8400' }) {
  const header = [
    '"EXTF"', '"700"', '21', '"Buchungsstapel"', '7', '', '', '', '', '',
    `"${periodStart.slice(0, 4)}"`,
    `"${(periodStart || '').replace(/-/g, '')}"`,
    `"${(periodEnd || '').replace(/-/g, '')}"`,
    `"${(periodStart || '').replace(/-/g, '')}"`,
    `"${(periodEnd || '').replace(/-/g, '')}"`,
    '', '', '', '', '', '', '', '', 'EUR'
  ].join(';')

  const cols = [
    'Umsatz (ohne Soll/Haben-Kz)', 'Soll/Haben-Kennzeichen', 'WKZ Umsatz',
    'Kurs', 'Basis-Umsatz', 'WKZ Basis-Umsatz', 'Konto', 'Gegenkonto (ohne BU-Schluessel)',
    'BU-Schluessel', 'Belegdatum', 'Belegfeld 1', 'Belegfeld 2', 'Skonto',
    'Buchungstext'
  ]
  const lines = [header, joinCsv(cols)]

  for (const inv of invoices || []) {
    const amount = Number(inv.amount || inv.total || 0).toFixed(2).replace('.', ',')
    const row = [
      amount,
      'S',
      'EUR',
      '',
      '',
      'EUR',
      String(inv.customer_account || '10000'),
      String(accountingFromAccount),
      '',
      ddmmyyyy(inv.issue_date || inv.created_at),
      String(inv.invoice_number || inv.id || '').slice(0, 36),
      '',
      '',
      String(inv.service_type || inv.title || 'Rechnung').slice(0, 60)
    ]
    lines.push(joinCsv(row))
  }
  return lines.join('\r\n') + '\r\n'
}

// lexoffice CSV — Spalten gem. lexoffice-Vorlage.
function buildLexofficeCsv({ invoices }) {
  const cols = [
    'Rechnungsnummer', 'Rechnungsdatum', 'Faelligkeitsdatum',
    'Kunde', 'Email', 'Betrag', 'Waehrung', 'Status', 'Leistungsbeschreibung'
  ]
  const lines = [joinCsv(cols, ',')]
  for (const inv of invoices || []) {
    const row = [
      inv.invoice_number || inv.id || '',
      inv.issue_date || inv.created_at || '',
      inv.due_date || '',
      inv.customer_name || '',
      inv.customer_email || '',
      Number(inv.amount || inv.total || 0).toFixed(2),
      inv.currency || 'EUR',
      inv.status || 'open',
      inv.service_type || inv.title || ''
    ]
    lines.push(joinCsv(row, ','))
  }
  return lines.join('\n') + '\n'
}

// sevDesk CSV.
function buildSevdeskCsv({ invoices }) {
  const cols = ['invoiceNumber', 'invoiceDate', 'dueDate', 'customerName', 'customerEmail', 'amount', 'currency', 'description']
  const lines = [joinCsv(cols, ',')]
  for (const inv of invoices || []) {
    const row = [
      inv.invoice_number || inv.id || '',
      inv.issue_date || '',
      inv.due_date || '',
      inv.customer_name || '',
      inv.customer_email || '',
      Number(inv.amount || inv.total || 0).toFixed(2),
      inv.currency || 'EUR',
      inv.service_type || inv.title || ''
    ]
    lines.push(joinCsv(row, ','))
  }
  return lines.join('\n') + '\n'
}

async function buildExport({ format, period_start, period_end, customer_id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')

  let q = supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, amount, total, currency, issue_date, due_date, created_at, status, service_type, title, customer_account')
    .gte('issue_date', period_start)
    .lte('issue_date', period_end)
    .order('issue_date', { ascending: true })
    .limit(5000)
  if (customer_id) q = q.eq('customer_id', customer_id)
  const { data: invoices, error } = await q
  if (error) throw error

  // Optional Customer-Anreicherung fuer Lexoffice/sevDesk.
  const customerIds = [...new Set((invoices || []).map((i) => i.customer_id).filter(Boolean))]
  const customerMap = new Map()
  if (customerIds.length) {
    const { data: custs } = await supabase
      .from('customers')
      .select('id, name, email')
      .in('id', customerIds)
    for (const c of custs || []) customerMap.set(c.id, c)
  }
  const enriched = (invoices || []).map((i) => ({
    ...i,
    customer_name: customerMap.get(i.customer_id)?.name || '',
    customer_email: customerMap.get(i.customer_id)?.email || ''
  }))

  let payload
  let contentType = 'text/csv; charset=utf-8'
  let suffix = 'csv'
  if (format === 'datev_extf') {
    payload = buildDatevExtf({ invoices: enriched, periodStart: period_start, periodEnd: period_end })
  } else if (format === 'lexoffice_csv') {
    payload = buildLexofficeCsv({ invoices: enriched })
  } else if (format === 'sevdesk_csv') {
    payload = buildSevdeskCsv({ invoices: enriched })
  } else {
    const e = new Error('Unbekanntes Format'); e.status = 400; throw e
  }
  return { payload, contentType, suffix, rowCount: enriched.length }
}

module.exports = {
  buildExport,
  buildDatevExtf,
  buildLexofficeCsv,
  buildSevdeskCsv,
  // Test helpers:
  _csvEscape: csvEscape,
  _ddmmyyyy: ddmmyyyy
}
