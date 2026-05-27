const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const widget = require('../services/reviewWidgetService')

function reviewWidgetRoutes() {
  const router = express.Router()

  // Admin: CRUD im Customer-Kontext.
  router.get('/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await widget.listForCustomer(req.params.customer_id)
      res.json({ ok: true, widgets: data })
    } catch (e) { next(e) }
  })

  router.post('/customer/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await widget.createWidget({ customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, widget: data })
    } catch (e) { next(e) }
  })

  router.patch('/customer/:customer_id/:id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const data = await widget.updateWidget({ id: req.params.id, customer_id: req.params.customer_id, ...req.body })
      res.json({ ok: true, widget: data })
    } catch (e) { next(e) }
  })

  return router
}

// Oeffentlicher iframe-Endpunkt: rendert HTML. Whitelist in server.js.
function reviewWidgetEmbedRouter() {
  const router = express.Router()
  router.get('/:slug', async (req, res, next) => {
    try {
      const html = await widget.renderEmbed(String(req.params.slug))
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=300')
      // Erlaube iframe-Einbettung von beliebigen Domains.
      res.setHeader('X-Frame-Options', 'ALLOWALL')
      res.send(html)
    } catch (e) { next(e) }
  })
  return router
}

module.exports = { reviewWidgetRoutes, reviewWidgetEmbedRouter }
