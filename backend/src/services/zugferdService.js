// ZUGFeRD-Light: PDF mit eingebettetem XRechnung-XML.
//
// Praxis: Eine "echte" ZUGFeRD-Datei ist ein PDF/A-3 mit eingebetteter
// factur-x.xml gemaess EN 16931. Voll-PDF/A-3-Konformitaet (Farbprofile,
// Schriftarten eingebettet, XMP-Metadaten in strenger Form) ist mit
// PDFKit allein nicht trivial machbar.
//
// Diese Implementierung liefert eine pragmatische ZUGFeRD-Light:
//   - PDFKit erzeugt ein normales PDF mit Rechnungsdaten.
//   - Das XRechnung-XML aus eInvoiceService wird per AFRelationship-Annex
//     in den PDF-Dateibaum eingebettet (PDF /EmbeddedFiles + /AF).
//   - Empfaenger, die XRechnung lesen koennen (Buchhaltungs-SaaS,
//     PEPPOL-Endpoints), finden das Attachment automatisch und verarbeiten
//     es. Visuelles Layout bleibt fuer Menschen lesbar.
//
// Wenn echte PDF/A-3-Konformitaet gefordert wird (z.B. Public Sector,
// X-Forderung 2027): externe Library wie mustangproject oder docnet ueber
// Microservice anbinden.

const PDFDocument = require('pdfkit')
const { buildXRechnungXml, deriveVat } = require('./eInvoiceService')

function eur(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))
}

// Erzeugt das ZUGFeRD-Light-PDF als Buffer.
async function buildZugferdPdf(invoice) {
  const xml = buildXRechnungXml(invoice)
  const totals = deriveVat(invoice)
  const xmlBuffer = Buffer.from(xml, 'utf-8')

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: {
        Title: `Rechnung ${invoice.invoice_number || invoice.id || ''}`,
        Author: invoice.seller?.name || 'Mecklenburg Marketing',
        Subject: 'Rechnung mit XRechnung-XML (ZUGFeRD-Light)',
        Keywords: 'XRechnung,ZUGFeRD,UBL,2.1,EN16931'
      }
    })

    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Visuelles Layout: Kopf, Adresse, Positionen, Summen.
    doc.fontSize(20).text('Rechnung', { align: 'right' })
    doc.moveDown(0.5)
    doc.fontSize(10)
      .text(invoice.seller?.name || 'Mecklenburg Marketing')
      .text(invoice.seller?.address || '')
      .text(`${invoice.seller?.postal_code || ''} ${invoice.seller?.city || ''}`)
      .text(invoice.seller?.email || '')
    doc.moveDown()
    doc.fontSize(11).text('Rechnungsempfänger:')
    doc.fontSize(10)
      .text(invoice.buyer?.name || '')
      .text(invoice.buyer?.address || '')
      .text(`${invoice.buyer?.postal_code || ''} ${invoice.buyer?.city || ''}`)
    if (invoice.buyer?.vat_id) doc.text(`USt-IdNr.: ${invoice.buyer.vat_id}`)
    doc.moveDown()

    doc.fontSize(11)
      .text(`Rechnungsnummer: ${invoice.invoice_number || invoice.id || ''}`)
      .text(`Rechnungsdatum: ${invoice.issue_date || new Date().toISOString().slice(0, 10)}`)
      .text(`Faelligkeit: ${invoice.due_date || '—'}`)
    doc.moveDown()

    const lines = Array.isArray(invoice.lines) && invoice.lines.length
      ? invoice.lines
      : [{ name: invoice.service_type || 'Dienstleistung', quantity: 1, unit_price: totals.netto }]

    doc.fontSize(11).text('Positionen:')
    doc.moveDown(0.3)
    lines.forEach((l, i) => {
      const qty = Number(l.quantity || 1)
      const unitPrice = Number(l.unit_price || 0)
      const total = qty * unitPrice
      doc.fontSize(10).text(`${i + 1}. ${l.name || 'Position'} — ${qty} × ${eur(unitPrice)} = ${eur(total)}`)
    })
    doc.moveDown()

    doc.fontSize(11).text(`Netto: ${eur(totals.netto)}`)
    doc.text(`USt ${totals.vatRate.toFixed(0)} %: ${eur(totals.vat)}`)
    doc.fontSize(13).text(`Gesamt: ${eur(totals.brutto)}`, { underline: true })
    doc.moveDown()
    if (invoice.seller?.iban) {
      doc.fontSize(10).text(`Bankverbindung: IBAN ${invoice.seller.iban}${invoice.seller.bic ? ` · BIC ${invoice.seller.bic}` : ''}`)
    }
    doc.moveDown()
    doc.fontSize(8).fillColor('#666')
      .text('Diese Rechnung enthaelt im Anhang eine maschinenlesbare XRechnung (UBL 2.1, EN 16931).')

    // PDF-Anhang: XML einbetten. PDFKit liefert .file(), das den Anhang
    // als /EmbeddedFiles registriert. Wir setzen relationship 'Source',
    // damit kompatible Reader die XML als Primaerdatei behandeln.
    doc.file(xmlBuffer, {
      name: 'xrechnung.xml',
      relationship: 'Source',
      description: 'XRechnung UBL 2.1 (EN 16931)',
      type: 'application/xml'
    })

    doc.end()
  })
}

module.exports = { buildZugferdPdf }
