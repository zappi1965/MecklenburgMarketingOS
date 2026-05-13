
const PDFDocument = require('pdfkit')

class PdfService {
  invoice(invoice) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 })
      const chunks = []

      doc.on('data', (c) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      doc.fontSize(22).text('Mecklenburg Marketing', { align: 'left' })
      doc.moveDown()
      doc.fontSize(18).text(`Rechnung ${invoice.invoice_number || invoice.id}`)
      doc.moveDown()
      doc.fontSize(12).text(`Betrag: ${invoice.amount || 0} EUR`)
      doc.text(`Status: ${invoice.status || 'Offen'}`)
      doc.text(`Fälligkeit: ${invoice.due_date || '-'}`)
      doc.moveDown()
      doc.text('Vielen Dank für die Zusammenarbeit.')
      doc.end()
    })
  }

  report(report, kpis = {}) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 })
      const chunks = []

      doc.on('data', (c) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      doc.fontSize(22).text(report.title || 'MMOS Report')
      doc.moveDown()
      doc.fontSize(12).text(`Status: ${report.status || 'Fertig'}`)
      doc.text(`Erstellt: ${report.created_at || new Date().toISOString()}`)
      doc.moveDown()
      doc.text('Core KPI Snapshot')
      doc.text(`Umsatz: ${kpis.revenue || 0} EUR`)
      doc.text(`Tickets offen: ${kpis.open_tickets || 0}`)
      doc.text(`SEO Traffic: ${kpis.seo_traffic || 0}`)
      doc.end()
    })
  }
}

module.exports = PdfService
