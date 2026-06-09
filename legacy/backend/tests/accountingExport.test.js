const test = require('node:test')
const assert = require('node:assert/strict')
const { buildDatevExtf, buildLexofficeCsv, buildSevdeskCsv, _csvEscape, _ddmmyyyy } = require('../src/services/accountingExportService')

test('csvEscape: schlichter Text bleibt unveraendert', () => {
  assert.equal(_csvEscape('Hello'), 'Hello')
})

test('csvEscape: Anfuehrungszeichen, Semikolon, Newline werden gequotet', () => {
  assert.equal(_csvEscape('a;b'), '"a;b"')
  assert.equal(_csvEscape('a"b'), '"a""b"')
  assert.equal(_csvEscape('a\nb'), '"a\nb"')
})

test('ddmmyyyy: ISO -> DDMMYYYY', () => {
  assert.equal(_ddmmyyyy('2026-05-26'), '26052026')
})

test('buildDatevExtf: header enthaelt EXTF und Periode', () => {
  const out = buildDatevExtf({ invoices: [], periodStart: '2026-01-01', periodEnd: '2026-03-31' })
  assert.match(out, /"EXTF"/)
  assert.match(out, /20260101/)
  assert.match(out, /20260331/)
})

test('buildDatevExtf: Rechnung wird zur Buchungszeile', () => {
  const out = buildDatevExtf({
    invoices: [{ invoice_number: 'RE-1', amount: 119, issue_date: '2026-05-26', service_type: 'Beratung' }],
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31'
  })
  assert.match(out, /119,00/)
  assert.match(out, /RE-1/)
  assert.match(out, /26052026/)
})

test('buildLexofficeCsv: Header korrekt', () => {
  const out = buildLexofficeCsv({ invoices: [] })
  assert.match(out, /Rechnungsnummer,Rechnungsdatum/)
})

test('buildLexofficeCsv: enthaelt Kundenname + E-Mail', () => {
  const out = buildLexofficeCsv({
    invoices: [{ invoice_number: 'RE-2', customer_name: 'Mueller GmbH', customer_email: 'a@b.de', amount: 100 }]
  })
  assert.match(out, /Mueller GmbH/)
  assert.match(out, /a@b\.de/)
})

test('buildSevdeskCsv: Header invoiceNumber etc', () => {
  const out = buildSevdeskCsv({ invoices: [] })
  assert.match(out, /invoiceNumber,invoiceDate/)
})
