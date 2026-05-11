const express = require('express')
const PDFDocument = require('pdfkit')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function money(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value || 0))
}

function dateDE(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('de-DE')
  } catch {
    return value
  }
}

function header(doc, title) {
  doc
    .fontSize(22)
    .fillColor('#111827')
    .text('Mecklenburg Marketing', 50, 50)

  doc
    .fontSize(10)
    .fillColor('#6b7280')
    .text('Agentur OS - PDF Engine', 50, 78)
    .text('kontakt@mecklenburg-marketing.de', 50, 92)

  doc
    .fontSize(20)
    .fillColor('#4c1d95')
    .text(title, 350, 55, { align: 'right' })

  doc
    .moveTo(50, 120)
    .lineTo(545, 120)
    .strokeColor('#e5e7eb')
    .stroke()
}

function footer(doc) {
  doc
    .fontSize(9)
    .fillColor('#9ca3af')
    .text('Mecklenburg Marketing OS - automatisch generiertes Dokument', 50, 760, {
      align: 'center',
      width: 495
    })
}

async function buildPdfBuffer(builder) {
  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    builder(doc)
    doc.end()
  })
}

async function uploadPdf(path, buffer) {
  try {
    const { error } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) return null

    const { data } = supabaseAdmin.storage.from('pdfs').getPublicUrl(path)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

async function getInvoice(invoiceId) {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*, customers(*)')
    .eq('id', invoiceId)
    .single()

  if (error) throw error
  return data
}

async function getInvoiceByNumber(invoiceNumber) {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*, customers(*)')
    .eq('invoice_number', invoiceNumber)
    .single()

  if (error) throw error
  return data
}

router.get('/invoice/:id', async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.id)

    const buffer = await buildPdfBuffer(doc => {
      header(doc, 'Rechnung')

      doc.fontSize(11).fillColor('#111827')
      doc.text('Rechnung an:', 50, 150)
      doc.fontSize(12).text(invoice.customers?.name || 'Kunde', 50, 168)
      doc.fontSize(10).fillColor('#4b5563')
      doc.text(invoice.customers?.email || '', 50, 185)
      doc.text(invoice.customers?.phone || '', 50, 200)

      doc.fillColor('#111827').fontSize(10)
      doc.text(`Rechnungsnummer: ${invoice.invoice_number}`, 350, 150)
      doc.text(`Rechnungsdatum: ${dateDE(invoice.invoice_date)}`, 350, 168)
      doc.text(`Fällig bis: ${dateDE(invoice.due_date)}`, 350, 186)
      doc.text(`Status: ${invoice.status}`, 350, 204)

      doc.moveTo(50, 250).lineTo(545, 250).strokeColor('#e5e7eb').stroke()

      doc.fontSize(10).fillColor('#6b7280')
      doc.text('Leistung', 55, 270)
      doc.text('Betrag', 455, 270)

      doc.moveTo(50, 292).lineTo(545, 292).strokeColor('#e5e7eb').stroke()

      doc.fontSize(12).fillColor('#111827')
      doc.text(invoice.service || 'Dienstleistung Mecklenburg Marketing OS', 55, 310, { width: 360 })
      doc.text(money(invoice.amount), 440, 310, { width: 90, align: 'right' })

      doc.moveTo(50, 355).lineTo(545, 355).strokeColor('#e5e7eb').stroke()

      doc.fontSize(15).fillColor('#111827')
      doc.text('Gesamtbetrag', 330, 380)
      doc.fontSize(18).fillColor('#4c1d95')
      doc.text(money(invoice.amount), 430, 376, { width: 100, align: 'right' })

      doc.fontSize(10).fillColor('#4b5563')
      doc.text('Zahlungsziel: 14 Tage ab Rechnungsdatum.', 50, 440)
      doc.text('Bitte geben Sie bei Zahlung die Rechnungsnummer als Verwendungszweck an.', 50, 455)

      footer(doc)
    })

    const fileName = `invoices/${invoice.invoice_number}.pdf`
    const publicUrl = await uploadPdf(fileName, buffer)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`)
    res.setHeader('X-PDF-URL', publicUrl || '')
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/reminder/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await getInvoiceByNumber(req.params.invoiceNumber)
    const fee = Number(req.query.fee || 15)
    const level = req.query.level || '1. Mahnung'

    const buffer = await buildPdfBuffer(doc => {
      header(doc, level)

      doc.fontSize(11).fillColor('#111827')
      doc.text('Mahnung an:', 50, 150)
      doc.fontSize(12).text(invoice.customers?.name || 'Kunde', 50, 168)
      doc.fontSize(10).fillColor('#4b5563')
      doc.text(invoice.customers?.email || '', 50, 185)

      doc.fillColor('#111827').fontSize(10)
      doc.text(`Rechnung: ${invoice.invoice_number}`, 350, 150)
      doc.text(`Rechnungsdatum: ${dateDE(invoice.invoice_date)}`, 350, 168)
      doc.text(`Fällig seit: ${dateDE(invoice.due_date)}`, 350, 186)

      doc.fontSize(12).fillColor('#111827')
      doc.text('Sehr geehrte Damen und Herren,', 50, 250)
      doc.text(
        `zu der oben genannten Rechnung ist aktuell noch ein Betrag offen. Bitte begleichen Sie den offenen Betrag inklusive Mahnzuschlag.`,
        50,
        280,
        { width: 495 }
      )

      doc.fontSize(12)
      doc.text(`Offener Rechnungsbetrag: ${money(invoice.amount)}`, 50, 345)
      doc.text(`Mahnzuschlag: ${money(fee)}`, 50, 365)

      doc.fontSize(16).fillColor('#4c1d95')
      doc.text(`Gesamt offen: ${money(Number(invoice.amount) + fee)}`, 50, 405)

      footer(doc)
    })

    await supabaseAdmin.from('reminders').insert({
      invoice_id: invoice.id,
      level,
      fee
    }).then(() => null)

    const fileName = `reminders/${invoice.invoice_number}-${level.replace(/\s+/g, '-')}.pdf`
    const publicUrl = await uploadPdf(fileName, buffer)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="Mahnung-${invoice.invoice_number}.pdf"`)
    res.setHeader('X-PDF-URL', publicUrl || '')
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/report', async (req, res) => {
  try {
    const { customer_id, kpis = ['SEO', 'Reviews', 'Umsatz'] } = req.body

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single()

    if (error) throw error

    const buffer = await buildPdfBuffer(doc => {
      header(doc, '30-Tage Report')

      doc.fontSize(13).fillColor('#111827')
      doc.text(`Kunde: ${customer.name}`, 50, 150)
      doc.text(`Branche: ${customer.branch || '-'}`, 50, 170)
      doc.text(`Bewertung: ${customer.rating || '-'} Sterne`, 50, 190)
      doc.text(`Umsatz: ${money(customer.revenue)}`, 50, 210)

      doc.moveTo(50, 245).lineTo(545, 245).strokeColor('#e5e7eb').stroke()

      let y = 275
      kpis.forEach((kpi, i) => {
        doc.fontSize(14).fillColor('#4c1d95').text(kpi, 50, y)
        doc.fontSize(10).fillColor('#374151').text(
          `Zusammenfassung ${i + 1}: Positive Entwicklung im Bereich ${kpi}. Maßnahmen und Trends wurden automatisch aus dem OS zusammengefasst.`,
          50,
          y + 22,
          { width: 495 }
        )
        y += 85
      })

      footer(doc)
    })

    const fileName = `reports/${customer.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`
    const publicUrl = await uploadPdf(fileName, buffer)

    await supabaseAdmin.from('reports').insert({
      customer_id,
      selected_kpis: kpis,
      pdf_url: publicUrl
    }).then(() => null)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="Report-${customer.name}.pdf"`)
    res.setHeader('X-PDF-URL', publicUrl || '')
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router