const express = require('express')
const { buildXRechnungXml } = require('../services/eInvoiceService')

// Endpunkte fuer XRechnung-Export.
// Eingehaengt in server.js mit requireAdmin.

function eInvoiceRoutes(supabase) {
  const router = express.Router()

  // Liefert die XRechnung als XML-Download fuer eine bestehende Rechnung.
  // Liest Rechnung + zugehoerigen Kunden aus der Datenbank, ergaenzt
  // Verkaeufer-Stammdaten aus ENV.
  router.get('/invoices/:id/xml', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ ok: false, error: 'invoice id fehlt' })

      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!invoice) return res.status(404).json({ ok: false, error: 'Rechnung nicht gefunden' })

      const { data: customer } = await supabase
        .from('customers')
        .select('id, name, email, phone, vat_id, contact_person, address, postal_code, city, country_code')
        .eq('id', invoice.customer_id)
        .maybeSingle()

      const seller = {
        name: process.env.E_INVOICE_SELLER_NAME || 'Mecklenburg Marketing',
        address: process.env.E_INVOICE_SELLER_ADDRESS || '',
        postal_code: process.env.E_INVOICE_SELLER_POSTAL_CODE || '',
        city: process.env.E_INVOICE_SELLER_CITY || '',
        country_code: process.env.E_INVOICE_SELLER_COUNTRY || 'DE',
        vat_id: process.env.E_INVOICE_SELLER_VAT_ID || '',
        tax_id: process.env.E_INVOICE_SELLER_TAX_ID || '',
        email: process.env.E_INVOICE_SELLER_EMAIL || '',
        iban: process.env.E_INVOICE_SELLER_IBAN || '',
        bic: process.env.E_INVOICE_SELLER_BIC || ''
      }

      const buyer = customer
        ? {
            name: customer.name,
            email: customer.email,
            address: customer.address,
            postal_code: customer.postal_code,
            city: customer.city,
            country_code: customer.country_code || 'DE',
            vat_id: customer.vat_id || ''
          }
        : { name: 'Kunde' }

      const xml = buildXRechnungXml({
        ...invoice,
        seller,
        buyer
      })

      const filename = `${(invoice.invoice_number || invoice.id).toString().replace(/[^a-z0-9_\-]/gi, '_')}_xrechnung.xml`
      res.setHeader('Content-Type', 'application/xml; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(xml)
    } catch (e) { next(e) }
  })

  // Vorschau-Endpoint: liefert das XML als JSON-Wrapped-Antwort, damit
  // das UI das XML inline anzeigen kann ohne Download.
  router.get('/invoices/:id/preview', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert' })
      const id = String(req.params.id || '')
      const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle()
      if (!invoice) return res.status(404).json({ ok: false, error: 'Rechnung nicht gefunden' })

      const { data: customer } = await supabase
        .from('customers')
        .select('name, email, vat_id, address, postal_code, city, country_code')
        .eq('id', invoice.customer_id)
        .maybeSingle()

      const xml = buildXRechnungXml({
        ...invoice,
        seller: {
          name: process.env.E_INVOICE_SELLER_NAME || 'Mecklenburg Marketing',
          country_code: 'DE',
          vat_id: process.env.E_INVOICE_SELLER_VAT_ID || ''
        },
        buyer: customer
          ? { name: customer.name, email: customer.email, vat_id: customer.vat_id, country_code: customer.country_code || 'DE' }
          : { name: 'Kunde' }
      })

      res.json({ ok: true, xml, format: 'XRechnung-UBL-2.1' })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = eInvoiceRoutes
