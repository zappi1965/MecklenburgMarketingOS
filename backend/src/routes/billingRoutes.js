
const express = require('express')

function billingRoutes(billingService) {
  const router = express.Router()

  router.get('/packages', (req, res) => {
    res.json({ ok: true, data: billingService.getPackageRules() })
  })

  router.post('/packages/sync', async (req, res, next) => {
    try {
      const data = await billingService.syncPackageCatalog()
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/package-requests/:id/approve', async (req, res, next) => {
    try {
      const data = await billingService.approvePackageRequest(req.params.id)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/subscriptions/change', async (req, res, next) => {
    try {
      const { customer_id, new_package, reason } = req.body || {}
      if (!customer_id || !new_package) return res.status(400).json({ ok: false, error: 'customer_id und new_package sind Pflichtfelder' })
      const data = await billingService.upgradeDowngrade({ customer_id: String(customer_id), new_package: String(new_package), reason: reason ? String(reason).slice(0, 500) : undefined })
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/contracts/generate', async (req, res, next) => {
    try {
      const data = await billingService.createContractFromPackage(req.body)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/invoices/package', async (req, res, next) => {
    try {
      const data = await billingService.createInvoiceForPackage(req.body)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/checkout/stripe', async (req, res, next) => {
    try {
      const data = await billingService.createStripeCheckout(req.body)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/checkout/paypal', async (req, res, next) => {
    try {
      const data = await billingService.createPaypalOrder(req.body)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = billingRoutes
