
const express = require('express')

function renderTemplate(template, values) {
  let out = String(template || '')
  for (const [k, v] of Object.entries(values || {})) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ''))
  }
  return out
}

function invoiceTemplateRoutes(supabaseAdmin) {
  const router = express.Router()

  router.post('/render', async (req, res, next) => {
    try {
      const { customer_id, template_text, invoice } = req.body
      const values = {
        KUNDENNAME: invoice?.customer_name || '',
        ADRESSE: invoice?.address || '',
        RECHNUNGSNUMMER: invoice?.invoice_number || '',
        BETRAG: invoice?.amount || '',
        LEISTUNG: invoice?.service_type || '',
        DATUM: invoice?.date || new Date().toLocaleDateString('de-DE'),
        FAELLIGKEIT: invoice?.due_date || ''
      }
      const rendered = renderTemplate(template_text, values)
      await supabaseAdmin.from('activity_logs').insert({
        customer_id,
        actor_name: invoice?.actor_name || 'DominiqueMM',
        action: 'invoice_template_rendered',
        message: `Rechnungsvorlage für ${values.RECHNUNGSNUMMER} gerendert`
      }).catch(()=>null)
      res.json({ ok: true, data: { rendered, values } })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = invoiceTemplateRoutes
