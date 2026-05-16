
const PDFDocument = require('pdfkit')

function bufferFromPdf(docBuilder) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    docBuilder(doc)
    doc.end()
  })
}

async function createDemoInvoicePdf(invoice) {
  return bufferFromPdf((doc) => {
    doc.fontSize(24).text('MecklenburgMarketingOS', { align: 'right' })
    doc.moveDown(1)
    doc.fontSize(28).text('Rechnung', { align: 'left' })
    doc.moveDown(.5)
    doc.fontSize(11).text(`Rechnungsnummer: ${invoice.invoice_number}`)
    doc.text(`Rechnungsdatum: ${new Date().toLocaleDateString('de-DE')}`)
    doc.moveDown(1.5)
    doc.fontSize(13).text('Rechnung an:')
    doc.fontSize(12).text(invoice.customer_name || 'Demo Kunde')
    doc.moveDown(1.5)
    doc.fontSize(13).text('Leistung')
    doc.moveDown(.3)
    doc.fontSize(12).text(invoice.service_type || 'Demo Leistung')
    doc.moveDown(1)
    const amount = Number(invoice.amount || 0)
    const vat = amount * 0.19
    const gross = amount + vat
    doc.text(`Netto: ${amount.toFixed(2)} EUR`)
    doc.text(`MwSt. 19%: ${vat.toFixed(2)} EUR`)
    doc.fontSize(14).text(`Brutto: ${gross.toFixed(2)} EUR`)
    doc.moveDown(2)
    doc.fontSize(10).text('Dies ist eine Demo-Rechnung aus der isolierten MMOS Demo-Umgebung.')
  })
}

async function createDemoMonthlyReportPdf(payload) {
  return bufferFromPdf((doc) => {
    doc.fontSize(24).text('MecklenburgMarketingOS', { align: 'right' })
    doc.moveDown(1)
    doc.fontSize(26).text('Demo Monatsreport')
    doc.moveDown(1)
    doc.fontSize(13).text(`Kunde: ${payload.customer_name || 'Demo Kunde'}`)
    doc.text(`Zeitraum: ${payload.period || new Date().toLocaleDateString('de-DE')}`)
    doc.moveDown(1)
    doc.fontSize(16).text('Zusammenfassung')
    doc.fontSize(12).text('SEO-Sichtbarkeit stabil, offene Tickets geprüft, Review Funnel aktiv.')
    doc.moveDown(1)
    doc.text('Demo KPIs:')
    doc.text('- SEO Growth: +12%')
    doc.text('- Offene Tickets: 2')
    doc.text('- Neue Reviews: 7')
    doc.text('- Conversion Funnel: aktiv')
  })
}

module.exports = { createDemoInvoicePdf, createDemoMonthlyReportPdf }
