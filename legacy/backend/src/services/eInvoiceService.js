// XRechnung / UBL-Erzeugung fuer deutsche B2B-Rechnungen.
//
// Hintergrund:
//   - Seit 01.01.2025 muessen B2B-Empfaenger in DE elektronische
//     Rechnungen im strukturierten Format empfangen koennen (Wachstums-
//     chancengesetz).
//   - Ab 2027 / 2028 (gestaffelt nach Umsatz) wird auch der Versand
//     Pflicht.
//   - Akzeptiert sind XRechnung (CIUS auf EN 16931) und ZUGFeRD/Factur-X
//     (PDF/A-3 mit eingebettetem XML).
//
// Diese Implementierung erzeugt das XML in UBL 2.1 mit XRechnung-CIUS.
// PDF/A-3-Einbettung (ZUGFeRD) ist ein separater Schritt im pdfService —
// fuer reine elektronische B2B-Uebermittlung (E-Mail-Anhang, PEPPOL)
// reicht das XML allein.

function escape(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDecimal(value) {
  const n = Number(value || 0)
  return n.toFixed(2)
}

function formatIsoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return d.toISOString().slice(0, 10)
}

// VAT-Berechnung. Wenn nicht angegeben: 19 % Standardsatz.
function deriveVat(invoice) {
  const total = Number(invoice.amount ?? invoice.total ?? 0)
  const vatRate = Number(invoice.vat_rate ?? 19)
  const netto = +(total / (1 + vatRate / 100)).toFixed(2)
  const vat = +(total - netto).toFixed(2)
  return { netto, vat, vatRate, brutto: total }
}

// Erzeugt das XRechnung-XML (UBL 2.1) fuer einen Rechnungs-Datensatz.
//
// Erwartet:
//   invoice = {
//     id, invoice_number, issue_date, due_date,
//     amount, vat_rate, currency='EUR',
//     service_type, notes,
//     buyer: { name, address, postal_code, city, country_code, vat_id, email },
//     seller: { name, address, postal_code, city, country_code, vat_id, tax_id, email, iban, bic },
//     lines: [{ name, quantity, unit_code='C62', unit_price, vat_rate }] // optional
//   }
function buildXRechnungXml(invoice) {
  if (!invoice) throw new Error('invoice fehlt')
  const seller = invoice.seller || {}
  const buyer = invoice.buyer || {}
  const currency = invoice.currency || 'EUR'
  const issue = formatIsoDate(invoice.issue_date)
  const due = invoice.due_date ? formatIsoDate(invoice.due_date) : ''
  const totals = deriveVat(invoice)

  // Wenn keine Einzelpositionen geliefert sind, behandeln wir den
  // Gesamtbetrag als eine einzige Position.
  const lines = Array.isArray(invoice.lines) && invoice.lines.length
    ? invoice.lines
    : [{
        name: invoice.service_type || invoice.title || 'Dienstleistung',
        quantity: 1,
        unit_code: 'C62',
        unit_price: totals.netto,
        vat_rate: totals.vatRate
      }]

  const linesXml = lines.map((line, idx) => {
    const qty = Number(line.quantity || 1)
    const unitPrice = Number(line.unit_price ?? totals.netto)
    const lineTotal = +(qty * unitPrice).toFixed(2)
    const vatRate = Number(line.vat_rate ?? totals.vatRate)
    return `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${escape(line.unit_code || 'C62')}">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatDecimal(lineTotal)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escape(line.name || 'Position')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${formatDecimal(vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${formatDecimal(unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
  }).join('')

  const payeeFinancialAccount = seller.iban ? `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escape(seller.iban)}</cbc:ID>
      ${seller.bic ? `<cac:FinancialInstitutionBranch><cbc:ID>${escape(seller.bic)}</cbc:ID></cac:FinancialInstitutionBranch>` : ''}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escape(invoice.invoice_number || invoice.id)}</cbc:ID>
  <cbc:IssueDate>${issue}</cbc:IssueDate>
  ${due ? `<cbc:DueDate>${due}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  ${invoice.notes ? `<cbc:Note>${escape(invoice.notes)}</cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escape(invoice.buyer_reference || buyer.reference || invoice.invoice_number || '0815')}</cbc:BuyerReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escape(seller.name || 'Mecklenburg Marketing')}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escape(seller.address || '')}</cbc:StreetName>
        <cbc:CityName>${escape(seller.city || '')}</cbc:CityName>
        <cbc:PostalZone>${escape(seller.postal_code || '')}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${escape(seller.country_code || 'DE')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${seller.vat_id ? `<cac:PartyTaxScheme><cbc:CompanyID>${escape(seller.vat_id)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escape(seller.name || 'Mecklenburg Marketing')}</cbc:RegistrationName>
        ${seller.tax_id ? `<cbc:CompanyID>${escape(seller.tax_id)}</cbc:CompanyID>` : ''}
      </cac:PartyLegalEntity>
      ${seller.email ? `<cac:Contact><cbc:ElectronicMail>${escape(seller.email)}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escape(buyer.name || 'Kunde')}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escape(buyer.address || '')}</cbc:StreetName>
        <cbc:CityName>${escape(buyer.city || '')}</cbc:CityName>
        <cbc:PostalZone>${escape(buyer.postal_code || '')}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${escape(buyer.country_code || 'DE')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${buyer.vat_id ? `<cac:PartyTaxScheme><cbc:CompanyID>${escape(buyer.vat_id)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity><cbc:RegistrationName>${escape(buyer.name || 'Kunde')}</cbc:RegistrationName></cac:PartyLegalEntity>
      ${buyer.email ? `<cac:Contact><cbc:ElectronicMail>${escape(buyer.email)}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  ${payeeFinancialAccount}

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${formatDecimal(totals.vat)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${formatDecimal(totals.netto)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${formatDecimal(totals.vat)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${formatDecimal(totals.vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatDecimal(totals.netto)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${formatDecimal(totals.netto)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${formatDecimal(totals.brutto)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${formatDecimal(totals.brutto)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</ubl:Invoice>`
}

module.exports = { buildXRechnungXml, deriveVat }
