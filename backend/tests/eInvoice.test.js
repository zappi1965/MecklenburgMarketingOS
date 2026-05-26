// Unit-Tests fuer den XRechnung-XML-Builder.
// Run: node --test tests/eInvoice.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { buildXRechnungXml, deriveVat } = require('../src/services/eInvoiceService')

test('deriveVat: 119 EUR bei 19% -> 100/19', () => {
  const r = deriveVat({ amount: 119, vat_rate: 19 })
  assert.equal(r.netto, 100)
  assert.equal(r.vat, 19)
  assert.equal(r.vatRate, 19)
  assert.equal(r.brutto, 119)
})

test('deriveVat: 0 EUR -> alles 0', () => {
  const r = deriveVat({ amount: 0 })
  assert.equal(r.netto, 0)
  assert.equal(r.vat, 0)
})

test('buildXRechnungXml: enthaelt die XRechnung-CustomizationID', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'RE-2026-0001',
    issue_date: '2026-05-26',
    amount: 119,
    seller: { name: 'MM GmbH', vat_id: 'DE123456789', country_code: 'DE' },
    buyer: { name: 'Kunde AG', vat_id: 'DE987654321', country_code: 'DE' }
  })
  assert.match(xml, /urn:cen\.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3\.0/)
})

test('buildXRechnungXml: Rechnungsnummer und Datum im XML', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'RE-2026-0001',
    issue_date: '2026-05-26',
    amount: 119,
    seller: { name: 'MM' },
    buyer: { name: 'Kunde' }
  })
  assert.match(xml, /<cbc:ID>RE-2026-0001<\/cbc:ID>/)
  assert.match(xml, /<cbc:IssueDate>2026-05-26<\/cbc:IssueDate>/)
})

test('buildXRechnungXml: Betraege korrekt aufgesplittet (netto/vat/brutto)', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'X-1',
    issue_date: '2026-01-01',
    amount: 119,
    seller: { name: 'S' },
    buyer: { name: 'B' }
  })
  // Netto 100, VAT 19, Brutto 119
  assert.match(xml, /<cbc:TaxAmount currencyID="EUR">19\.00<\/cbc:TaxAmount>/)
  assert.match(xml, /<cbc:TaxableAmount currencyID="EUR">100\.00<\/cbc:TaxableAmount>/)
  assert.match(xml, /<cbc:PayableAmount currencyID="EUR">119\.00<\/cbc:PayableAmount>/)
})

test('buildXRechnungXml: Sonderzeichen werden XML-escaped', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'RE-1',
    amount: 119,
    seller: { name: 'A & B "GmbH"' },
    buyer: { name: '<Test>' }
  })
  assert.match(xml, /A &amp; B &quot;GmbH&quot;/)
  assert.match(xml, /&lt;Test&gt;/)
})

test('buildXRechnungXml: IBAN/BIC werden in PaymentMeans aufgenommen', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'RE-2',
    amount: 119,
    seller: { name: 'S', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX' },
    buyer: { name: 'B' }
  })
  assert.match(xml, /<cac:PaymentMeans>/)
  assert.match(xml, /DE89370400440532013000/)
  assert.match(xml, /COBADEFFXXX/)
})

test('buildXRechnungXml: ohne lines wird Standard-Position aus service_type erzeugt', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'RE-3',
    service_type: 'Beratungsleistung Mai 2026',
    amount: 119,
    seller: { name: 'S' },
    buyer: { name: 'B' }
  })
  assert.match(xml, /<cac:InvoiceLine>/)
  assert.match(xml, /<cbc:Name>Beratungsleistung Mai 2026<\/cbc:Name>/)
})

test('buildXRechnungXml: BuyerReference Pflichtfeld vorhanden', () => {
  const xml = buildXRechnungXml({
    invoice_number: 'RE-4',
    amount: 119,
    seller: { name: 'S' },
    buyer: { name: 'B' }
  })
  // BuyerReference ist BT-10 Pflichtfeld in XRechnung CIUS
  assert.match(xml, /<cbc:BuyerReference>/)
})
