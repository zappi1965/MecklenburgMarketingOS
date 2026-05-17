
const PDFDocument = require('pdfkit')
const QRCode = require('qrcode')

function makePdf(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    build(doc)
    doc.end()
  })
}

async function invoicePdf(invoice) {
  return makePdf(doc => {
    const amount = Number(invoice.amount || invoice.total || invoice.price || 0)
    const vat = amount * 0.19
    const gross = amount + vat
    doc.fontSize(24).text('Mecklenburg Marketing', { align: 'right' })
    doc.moveDown()
    doc.fontSize(26).text('Rechnung')
    doc.fontSize(11).text(`Rechnungsnummer: ${invoice.invoice_number || invoice.id || 'ENTWURF'}`)
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`)
    doc.text(`Status: ${invoice.status || 'Offen'}`)
    doc.moveDown()
    doc.fontSize(13).text('Kunde')
    doc.fontSize(12).text(invoice.customer_name || 'Kunde')
    doc.moveDown()
    doc.fontSize(13).text('Leistung')
    doc.fontSize(12).text(invoice.service_type || invoice.service_category_name || 'Dienstleistung')
    doc.moveDown()
    doc.text(`Netto: ${amount.toFixed(2)} EUR`)
    doc.text(`MwSt. 19%: ${vat.toFixed(2)} EUR`)
    doc.fontSize(15).text(`Brutto: ${gross.toFixed(2)} EUR`)
    doc.moveDown(2)
    doc.fontSize(9).text('Automatisch erzeugt durch MMOS.')
  })
}

async function reportPdf(report) {
  return makePdf(doc => {
    doc.fontSize(24).text('Mecklenburg Marketing', { align: 'right' })
    doc.moveDown()
    doc.fontSize(26).text(report.title || 'Advanced Report')
    doc.fontSize(12).text(`Kunde: ${report.customer_name || 'Kunde'}`)
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`)
    doc.moveDown()
    doc.text(`Umsatz: ${Number(report.revenue || 0).toFixed(2)} EUR`)
    doc.text(`Leads: ${report.leads || 0}`)
    doc.text(`QR Scans: ${report.qr_scans || 0}`)
    doc.text(`Offene Tickets: ${report.open_tickets || 0}`)
  })
}

function slugify(input) {
  return String(input || 'kampagne').toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}

async function buildQr({ name, customer_name, redirect_url }) {
  const base = process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || 'https://mecklenburgmarketing.de'
  const slug = `${slugify(customer_name || 'kunde')}-${slugify(name)}-${Date.now().toString(36)}`
  const public_url = `${base.replace(/\/$/,'')}/r/${slug}`
  return {
    slug,
    public_url,
    redirect_url: redirect_url || public_url,
    qr_svg: await QRCode.toString(public_url, { type:'svg', width:512, margin:1 }),
    qr_png_base64: await QRCode.toDataURL(public_url, { width:512, margin:1 })
  }
}

function calculateProbability(lead) {
  if (lead.probability_manual) return Number(lead.probability || 0)
  const stage = String(lead.stage || 'lead').toLowerCase()
  const base = { lead:10, qualified:25, angebot:50, negotiation:70, won:100, lost:0 }[stage] ?? 15
  return Math.max(0, Math.min(100, base + (Number(lead.value || 0) > 500 ? 5 : 0) + (lead.expected_close_date ? 5 : 0)))
}

function successScore({ customer, revenue=0, openTickets=0, seoScore=50, reviews=0, activity=50 }) {
  const weights = customer?.success_score_config?.weights || { revenue:30, tickets:20, seo:20, reviews:15, activity:15 }
  const revenueScore = Math.min(100, revenue / 10)
  const ticketScore = Math.max(0, 100 - openTickets * 20)
  const reviewScore = Math.min(100, reviews * 10)
  return Math.round((revenueScore*(weights.revenue||0)+ticketScore*(weights.tickets||0)+seoScore*(weights.seo||0)+reviewScore*(weights.reviews||0)+activity*(weights.activity||0))/100)
}

module.exports = { invoicePdf, reportPdf, buildQr, calculateProbability, successScore }
